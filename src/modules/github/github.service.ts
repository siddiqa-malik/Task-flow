import mongoose, { isValidObjectId } from "mongoose";
import { Issue, IIssue, IssueStatus, IssuePriority } from "../issues/issue.model.js";
import { Team } from "../teams/team.model.js";
import { Project } from "../projects/project.model.js";
import { Label } from "../labels/label.model.js";
import { WorkflowState } from "../workflowStates/workflowState.model.js";
import { createIssue } from "../issues/issue.service.js";

export interface GithubRepoItem {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  description: string | null;
  openIssuesCount: number;
  url: string;
  defaultBranch: string;
}

export interface GithubIssueItem {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  htmlUrl: string;
  user: {
    login: string;
    avatarUrl: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
}

/*
 * Fetches authenticated user's repositories from GitHub REST API
 */
export const fetchUserRepos = async (token: string): Promise<GithubRepoItem[]> => {
  if (!token?.trim()) {
    throw new Error("GitHub Personal Access Token is required to list repositories");
  }

  const cleanToken = token.trim();
  const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      "User-Agent": "TaskFlow-App",
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const msg = errorBody?.message || `GitHub API error: HTTP ${response.status}`;
    throw new Error(msg);
  }

  const repos: any[] = await response.json();
  if (!Array.isArray(repos)) return [];

  return repos.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    owner: r.owner?.login || "",
    private: Boolean(r.private),
    description: r.description || null,
    openIssuesCount: r.open_issues_count || 0,
    url: r.html_url,
    defaultBranch: r.default_branch || "main",
  }));
};

/*
 * Fetches issues from a specific repository (supports public repos with or without token)
 * Automatically filters out Pull Requests because GitHub API returns PRs as issues
 */
export const fetchRepoIssues = async (params: {
  owner: string;
  repo: string;
  token?: string;
  state?: "open" | "closed" | "all";
  page?: number;
  perPage?: number;
}): Promise<GithubIssueItem[]> => {
  const { owner, repo, token, state = "open", page = 1, perPage = 100 } = params;

  if (!owner?.trim() || !repo?.trim()) {
    throw new Error("Both owner and repository name are required (e.g. facebook/react)");
  }

  const cleanOwner = encodeURIComponent(owner.trim());
  const cleanRepo = encodeURIComponent(repo.trim());

  const headers: Record<string, string> = {
    "User-Agent": "TaskFlow-App",
    Accept: "application/vnd.github.v3+json",
  };

  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  const url = `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/issues?state=${state}&per_page=${perPage}&page=${page}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const msg = errorBody?.message || `Failed to fetch issues: HTTP ${response.status}`;
    throw new Error(msg);
  }

  const rawIssues: any[] = await response.json();
  if (!Array.isArray(rawIssues)) return [];

  // Filter out Pull Requests (GitHub issues API includes PRs where issue.pull_request !== undefined)
  const onlyIssues = rawIssues.filter((i) => !i.pull_request);

  return onlyIssues.map((i) => ({
    id: i.id,
    number: i.number,
    title: i.title || `Issue #${i.number}`,
    body: i.body || "",
    state: i.state === "closed" ? "closed" : "open",
    htmlUrl: i.html_url,
    user: {
      login: i.user?.login || "github-user",
      avatarUrl: i.user?.avatar_url || "",
    },
    labels: Array.isArray(i.labels)
      ? i.labels.map((l: any) => ({
          name: typeof l === "string" ? l : l.name,
          color: typeof l === "string" ? "888888" : l.color || "888888",
        }))
      : [],
    createdAt: i.created_at,
    updatedAt: i.updated_at,
    commentsCount: i.comments || 0,
  }));
};

/*
 * Batch imports selected GitHub issues into TaskFlow
 * Maps:
 * - Title and Body (with GitHub backlink citation)
 * - State (open -> unstarted, closed -> completed)
 * - Labels (creates or links matching labels in TaskFlow)
 * - Priority (heuristically detected from labels or set to default)
 * - Assigns proper identifiers (e.g. ENG-45) via team issueCounter
 */
export const importGithubIssues = async (params: {
  workspaceId: string;
  teamId: string;
  projectId?: string;
  defaultPriority?: IssuePriority;
  issues: Array<{
    number: number;
    title: string;
    body?: string;
    state?: string;
    htmlUrl?: string;
    labels?: Array<{ name: string; color: string }>;
    user?: { login: string };
  }>;
  userId: string;
}): Promise<{
  importedCount: number;
  issues: IIssue[];
}> => {
  const { workspaceId, teamId, projectId, defaultPriority = "none", issues, userId } = params;

  if (!teamId || !isValidObjectId(teamId)) {
    throw new Error("Valid target teamId is required for import");
  }
  if (!workspaceId || !isValidObjectId(workspaceId)) {
    throw new Error("Valid workspaceId is required for import");
  }
  if (!Array.isArray(issues) || issues.length === 0) {
    throw new Error("No issues selected for import");
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw new Error("Target team not found");
  }

  // Pre-load existing labels for this workspace to avoid duplicate label creations
  const existingLabels = await Label.find({ workspaceId: new mongoose.Types.ObjectId(workspaceId) });
  const labelMap = new Map<string, mongoose.Types.ObjectId>();
  existingLabels.forEach((lbl) => {
    labelMap.set(lbl.name.toLowerCase().trim(), lbl._id as mongoose.Types.ObjectId);
  });

  // Helper to resolve or create a label in TaskFlow
  const resolveLabelId = async (name: string, color: string): Promise<mongoose.Types.ObjectId> => {
    const cleanName = name.trim();
    const key = cleanName.toLowerCase();
    if (labelMap.has(key)) {
      return labelMap.get(key)!;
    }

    const hexColor = color.startsWith("#") ? color : `#${color}`;
    const newLbl = await Label.create({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      teamId: new mongoose.Types.ObjectId(teamId),
      name: cleanName,
      color: hexColor,
    });

    labelMap.set(key, newLbl._id as mongoose.Types.ObjectId);
    return newLbl._id as mongoose.Types.ObjectId;
  };

  // Helper to map issue priority from labels or fallback
  const derivePriority = (issueLabels: Array<{ name: string }>): IssuePriority => {
    const lowerLabels = issueLabels.map((l) => (l.name || "").toLowerCase());
    if (lowerLabels.some((l) => l.includes("urgent") || l.includes("critical") || l === "p0")) {
      return "urgent";
    }
    if (lowerLabels.some((l) => l.includes("high") || l.includes("p1") || l === "bug")) {
      return "high";
    }
    if (lowerLabels.some((l) => l.includes("low") || l.includes("p3") || l.includes("trivial"))) {
      return "low";
    }
    if (lowerLabels.some((l) => l.includes("medium") || l.includes("p2"))) {
      return "medium";
    }
    return defaultPriority;
  };

  const createdIssues: IIssue[] = [];

  for (const ghIssue of issues) {
    const ghNumber = ghIssue.number;
    const ghTitle = ghIssue.title?.trim() || `GitHub Issue #${ghNumber}`;
    const ghUrl = ghIssue.htmlUrl || `https://github.com/issues/${ghNumber}`;
    const ghAuthor = ghIssue.user?.login ? `@${ghIssue.user.login}` : "GitHub";

    // Format description with a clean citation footer
    const descriptionContent = ghIssue.body?.trim()
      ? `${ghIssue.body.trim()}\n\n---\n*Imported from GitHub [#${ghNumber}](${ghUrl}) by ${ghAuthor}*`
      : `*Imported from GitHub [#${ghNumber}](${ghUrl}) by ${ghAuthor}*`;

    // Map GitHub state to Linear status
    const status: IssueStatus = ghIssue.state === "closed" ? "completed" : "unstarted";

    // Resolve labels
    const labelIds: string[] = [];
    if (Array.isArray(ghIssue.labels)) {
      for (const lbl of ghIssue.labels) {
        if (lbl.name) {
          try {
            const lid = await resolveLabelId(lbl.name, lbl.color || "888888");
            labelIds.push(lid.toString());
          } catch {}
        }
      }
    }

    const priority = derivePriority(ghIssue.labels || []);

    const created = await createIssue(
      {
        workspaceId,
        teamId,
        projectId: projectId && isValidObjectId(projectId) ? projectId : undefined,
        title: ghTitle,
        description: descriptionContent,
        status,
        priority,
        labels: labelIds,
      },
      userId
    );

    createdIssues.push(created);
  }

  return {
    importedCount: createdIssues.length,
    issues: createdIssues,
  };
};

