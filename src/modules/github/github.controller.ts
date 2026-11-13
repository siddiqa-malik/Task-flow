import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../types/auth.types.js";
import {
  fetchUserRepos,
  fetchRepoIssues,
  importGithubIssues,
} from "./github.service.js";

/*
 * GET /api/github/repos
 * Lists repositories of the authenticated GitHub account
 */
export const getRepos = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const token =
      (req.query.token as string) ||
      (req.headers["x-github-token"] as string) ||
      process.env.GITHUB_ACCESS_TOKEN ||
      "";

    if (!token) {
      res.status(400).json({
        success: false,
        message: "GitHub Personal Access Token is required to fetch user repositories",
      });
      return;
    }

    const repos = await fetchUserRepos(token);
    res.status(200).json({
      success: true,
      count: repos.length,
      data: repos,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch GitHub repositories",
    });
  }
};

/*
 * GET /api/github/issues
 * Fetches issues from a given owner/repo (supports public repos with or without token)
 */
export const getIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    const owner = (req.query.owner as string) || (req.params.owner as string) || "";
    const repo = (req.query.repo as string) || (req.params.repo as string) || "";
    const state = (req.query.state as "open" | "closed" | "all") || "open";
    const token =
      (req.query.token as string) ||
      (req.headers["x-github-token"] as string) ||
      process.env.GITHUB_ACCESS_TOKEN ||
      undefined;

    if (!owner.trim() || !repo.trim()) {
      res.status(400).json({
        success: false,
        message: "Both owner and repo are required (e.g. ?owner=facebook&repo=react)",
      });
      return;
    }

    const issues = await fetchRepoIssues({
      owner: owner.trim(),
      repo: repo.trim(),
      token: token ? token.trim() : undefined,
      state,
    });

    res.status(200).json({
      success: true,
      count: issues.length,
      data: issues,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch repository issues from GitHub",
    });
  }
};

/*
 * POST /api/github/import
 * Imports selected GitHub issues into TaskFlow
 */
export const importIssues = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required to import issues",
      });
      return;
    }

    const { workspaceId, teamId, projectId, defaultPriority, issues } = req.body;

    if (!workspaceId) {
      res.status(400).json({
        success: false,
        message: "Target workspaceId is required",
      });
      return;
    }

    if (!teamId) {
      res.status(400).json({
        success: false,
        message: "Target teamId is required",
      });
      return;
    }

    if (!Array.isArray(issues) || issues.length === 0) {
      res.status(400).json({
        success: false,
        message: "Please select at least one issue to import",
      });
      return;
    }

    const result = await importGithubIssues({
      workspaceId,
      teamId,
      projectId,
      defaultPriority,
      issues,
      userId,
    });

    res.status(201).json({
      success: true,
      message: `Successfully imported ${result.importedCount} issue(s) from GitHub`,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error?.message || "Failed to import GitHub issues",
    });
  }
};

