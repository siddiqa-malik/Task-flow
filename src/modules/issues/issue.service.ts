import mongoose, { isValidObjectId } from "mongoose";
import { Issue, IIssue, IssueStatus, IssuePriority } from "./issue.model.js";
import { Team } from "../teams/team.model.js";
import { WorkflowState } from "../workflowStates/workflowState.model.js";
import { Project } from "../projects/project.model.js";

export interface CreateIssueInput {
  workspaceId?: string;
  teamId?: string;
  projectId?: string;
  cycleId?: string;
  parentId?: string;
  title: string;
  description?: string;
  status?: IssueStatus;
  stateId?: string;
  priority?: IssuePriority;
  estimate?: number;
  assignedTo?: string;
  dueDate?: Date | string;
  labels?: string[];
  sortOrder?: number;
}

/*
 * Creates a new issue with high efficiency and strict Linear association rules.
 * Optimized for low latency: minimizes remote Atlas roundtrips by resolving
 * team IDs directly when provided and trimming populates to essential display fields.
 */
export const createIssue = async (
  input: CreateIssueInput,
  userId: string
): Promise<IIssue> => {
  let team: any = null;
  let tId: mongoose.Types.ObjectId | undefined = undefined;

  // 1. Direct Resolution: If valid teamId is provided, use it directly (0 db roundtrips)
  if (input.teamId && isValidObjectId(input.teamId)) {
    tId = new mongoose.Types.ObjectId(input.teamId);
  }

  // 2. Resolve Team from Project if teamId was not directly provided
  if (!tId && input.projectId && isValidObjectId(input.projectId)) {
    try {
      const proj = await Project.findById(input.projectId).select("teamId").lean();
      if (proj && proj.teamId) {
        if (isValidObjectId(proj.teamId)) {
          tId = new mongoose.Types.ObjectId(proj.teamId);
        } else {
          const foundTeam = await Team.findOne({
            $or: [{ name: new RegExp('^' + proj.teamId + '$', 'i') }, { key: (proj.teamId as string).toUpperCase() }]
          }).select("_id").lean();
          if (foundTeam) tId = foundTeam._id as mongoose.Types.ObjectId;
        }
      }
    } catch {}
  }

  // 3. Resolve Team by name or key if not found by ID
  if (!tId && input.teamId) {
    const foundTeam = await Team.findOne({
      $or: [{ name: new RegExp('^' + input.teamId + '$', 'i') }, { key: input.teamId.toUpperCase() }]
    }).select("_id").lean();
    if (foundTeam) tId = foundTeam._id as mongoose.Types.ObjectId;
  }

  // 4. Fallback: Find first team in the workspace
  if (!tId) {
    const filter: any = {};
    if (input.workspaceId && isValidObjectId(input.workspaceId)) {
      filter.workspaceId = new mongoose.Types.ObjectId(input.workspaceId);
    }
    const foundTeam = await Team.findOne(filter).select("_id").lean();
    if (foundTeam) tId = foundTeam._id as mongoose.Types.ObjectId;
  }

  // 5. Fallback: If still no team in database, create a default team
  if (!tId) {
    const defaultWsId = input.workspaceId && isValidObjectId(input.workspaceId)
      ? new mongoose.Types.ObjectId(input.workspaceId)
      : new mongoose.Types.ObjectId();
    const createdTeam = await Team.create({
      name: "Engineering",
      key: "ENG",
      workspaceId: defaultWsId,
      status: "active",
      issueCounter: 0,
    });
    tId = createdTeam._id as mongoose.Types.ObjectId;
  }

  // Concurrently update team counter and resolve assignee in parallel
  const teamUpdatePromise = Team.findByIdAndUpdate(
    tId,
    { $inc: { issueCounter: 1 } },
    { new: true, select: "issueCounter key workspaceId" }
  ).lean();

  let assignedToPromise: Promise<mongoose.Types.ObjectId | undefined> = Promise.resolve(undefined);
  if (input.assignedTo) {
    if (isValidObjectId(input.assignedTo)) {
      assignedToPromise = Promise.resolve(new mongoose.Types.ObjectId(input.assignedTo));
    } else if (typeof input.assignedTo === 'string' && input.assignedTo.includes('@')) {
      assignedToPromise = (async () => {
        const userDoc = await mongoose.connection.db?.collection('users').findOne({
          email: input.assignedTo!.toLowerCase().trim(),
        });
        return userDoc ? (userDoc._id as any) : undefined;
      })();
    }
  }

  const [updatedTeam, resolvedAssignedToId] = await Promise.all([
    teamUpdatePromise,
    assignedToPromise,
  ]);

  team = updatedTeam;
  const issueNumber = team?.issueCounter || 1;
  const identifier = team?.key ? `${team.key}-${issueNumber}` : `ISSUE-${issueNumber}`;
  const workspaceId = input.workspaceId && isValidObjectId(input.workspaceId)
    ? new mongoose.Types.ObjectId(input.workspaceId)
    : team?.workspaceId;

  // Resolve status & stateId
  let stateId: mongoose.Types.ObjectId | undefined = undefined;
  let status: IssueStatus = (input.status as any) === "todo" ? "unstarted" : (input.status as any) === "in-progress" ? "started" : input.status || "unstarted";

  if (input.stateId && isValidObjectId(input.stateId)) {
    stateId = new mongoose.Types.ObjectId(input.stateId);
  }

  // Resolve valid labels
  const labelIds: mongoose.Types.ObjectId[] = [];
  if (Array.isArray(input.labels)) {
    for (const l of input.labels) {
      if (isValidObjectId(l)) {
        labelIds.push(new mongoose.Types.ObjectId(l));
      }
    }
  }

  // Resolve valid projectId
  const projId = input.projectId && isValidObjectId(input.projectId)
    ? new mongoose.Types.ObjectId(input.projectId)
    : undefined;

  const issue = await Issue.create({
    workspaceId,
    teamId: tId,
    projectId: projId,
    cycleId: input.cycleId && isValidObjectId(input.cycleId) ? new mongoose.Types.ObjectId(input.cycleId) : undefined,
    parentId: input.parentId && isValidObjectId(input.parentId) ? new mongoose.Types.ObjectId(input.parentId) : undefined,
    number: issueNumber,
    identifier,
    title: input.title.trim(),
    description: input.description ? input.description.trim() : undefined,
    status,
    stateId,
    priority: input.priority || "none",
    estimate: input.estimate,
    createdBy: isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : undefined,
    assignedTo: resolvedAssignedToId,
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    labels: labelIds,
    sortOrder: input.sortOrder ?? 0,
  });

  return await issue.populate([
    { path: "teamId", select: "name key icon color" },
    { path: "assignedTo", select: "name email avatar" },
    { path: "labels", select: "name color" },
    { path: "projectId", select: "name" },
  ]);
};

/*
 * Retrieves issues matching query filters.
 * Populates only high-value list fields (teamId, assignedTo, projectId, labels)
 * to avoid sequential roundtrip waterfalls to MongoDB Atlas.
 */
export const getIssues = async (query: {
  workspaceId?: string;
  teamId?: string;
  projectId?: string;
  cycleId?: string;
  parentId?: string;
  status?: string;
  stateId?: string;
  priority?: string;
  assignedTo?: string;
  search?: string;
  onlyRoots?: boolean; // exclude sub-issues if true
}) => {
  const filter: any = {};

  if (query.workspaceId && isValidObjectId(query.workspaceId)) {
    filter.workspaceId = new mongoose.Types.ObjectId(query.workspaceId);
  }
  if (query.teamId && isValidObjectId(query.teamId)) {
    const teamObjId = new mongoose.Types.ObjectId(query.teamId);
    const teamIdStr = query.teamId.toString();
    // Find all projects belonging to this team to include their issues in one query
    const teamProjects = await Project.find({
      $or: [{ teamId: teamIdStr }, { teamId: teamObjId as any }]
    }).select("_id").lean();
    const projIds = teamProjects.map((p) => p._id);
    if (projIds.length > 0) {
      filter.$or = [{ teamId: teamObjId }, { projectId: { $in: projIds } }];
    } else {
      filter.teamId = teamObjId;
    }
  }
  if (query.projectId && isValidObjectId(query.projectId)) {
    filter.projectId = new mongoose.Types.ObjectId(query.projectId);
  }
  if (query.cycleId && isValidObjectId(query.cycleId)) {
    filter.cycleId = new mongoose.Types.ObjectId(query.cycleId);
  }
  if (query.parentId && isValidObjectId(query.parentId)) {
    filter.parentId = new mongoose.Types.ObjectId(query.parentId);
  } else if (query.onlyRoots) {
    filter.parentId = { $exists: false };
  }

  if (query.status) {
    filter.status = query.status;
  }
  if (query.stateId && isValidObjectId(query.stateId)) {
    filter.stateId = new mongoose.Types.ObjectId(query.stateId);
  }
  if (query.priority) {
    filter.priority = query.priority;
  }
  if (query.assignedTo && isValidObjectId(query.assignedTo)) {
    filter.assignedTo = new mongoose.Types.ObjectId(query.assignedTo);
  }
  if (query.search?.trim()) {
    const s = query.search.trim();
    filter.$or = [
      { title: { $regex: s, $options: "i" } },
      { identifier: { $regex: s, $options: "i" } },
    ];
  }

  return await Issue.find(filter)
    .sort({ sortOrder: 1, createdAt: -1 })
    .populate([
      { path: "teamId", select: "name key icon color" },
      { path: "assignedTo", select: "name email avatar" },
      { path: "labels", select: "name color" },
      { path: "projectId", select: "name" },
    ])
    .lean();
};

export const getIssueByIdOrIdentifier = async (idOrKey: string) => {
  let issue;
  if (isValidObjectId(idOrKey)) {
    issue = await Issue.findById(idOrKey);
  }
  if (!issue) {
    issue = await Issue.findOne({ identifier: idOrKey.toUpperCase() });
  }

  if (!issue) return null;

  return await issue.populate([
    { path: "teamId", select: "name key icon color" },
    { path: "stateId", select: "name color type position" },
    { path: "assignedTo", select: "name email avatar" },
    { path: "createdBy", select: "name email avatar" },
    { path: "labels", select: "name color" },
    { path: "projectId", select: "name" },
    { path: "cycleId", select: "name number" },
    { path: "parentId", select: "title identifier number" },
  ]);
};

export const getSubIssues = async (parentId: string) => {
  if (!isValidObjectId(parentId)) return [];
  return await Issue.find({
    parentId: new mongoose.Types.ObjectId(parentId),
  })
    .sort({ sortOrder: 1, createdAt: -1 })
    .populate([
      { path: "stateId", select: "name color type" },
      { path: "assignedTo", select: "name email avatar" },
      { path: "labels", select: "name color" },
    ]);
};

export const updateIssue = async (
  idOrKey: string,
  updates: Partial<{
    title: string;
    description: string;
    status: IssueStatus;
    stateId: string;
    priority: IssuePriority;
    estimate: number;
    assignedTo: string | null;
    dueDate: Date | string | null;
    projectId: string | null;
    teamId: string | null;
    cycleId: string | null;
    parentId: string | null;
    labels: string[];
    sortOrder: number;
  }>
) => {
  const filter = isValidObjectId(idOrKey)
    ? { _id: new mongoose.Types.ObjectId(idOrKey) }
    : { identifier: idOrKey.toUpperCase() };

  const updateDoc: any = {};

  if (updates.title !== undefined) updateDoc.title = updates.title.trim();
  if (updates.description !== undefined) updateDoc.description = updates.description?.trim();
  if (updates.status !== undefined) updateDoc.status = updates.status;
  if (updates.priority !== undefined) updateDoc.priority = updates.priority;
  if (updates.estimate !== undefined) updateDoc.estimate = updates.estimate;
  if (updates.sortOrder !== undefined) updateDoc.sortOrder = updates.sortOrder;

  if (updates.teamId !== undefined) {
    if (updates.teamId && isValidObjectId(updates.teamId)) {
      updateDoc.teamId = new mongoose.Types.ObjectId(updates.teamId);
    }
  }

  if (updates.stateId !== undefined) {
    if (updates.stateId && isValidObjectId(updates.stateId)) {
      updateDoc.stateId = new mongoose.Types.ObjectId(updates.stateId);
      const state = await WorkflowState.findById(updates.stateId);
      if (state) updateDoc.status = state.type;
    } else {
      updateDoc.stateId = null;
    }
  }

  if (updates.assignedTo !== undefined) {
    updateDoc.assignedTo = updates.assignedTo ? new mongoose.Types.ObjectId(updates.assignedTo) : null;
  }
  if (updates.dueDate !== undefined) {
    updateDoc.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
  }
  if (updates.projectId !== undefined) {
    if (updates.projectId && isValidObjectId(updates.projectId)) {
      const pId = new mongoose.Types.ObjectId(updates.projectId);
      updateDoc.projectId = pId;
      try {
        const proj = await Project.findById(pId);
        if (proj && proj.teamId) {
          if (isValidObjectId(proj.teamId)) {
            updateDoc.teamId = new mongoose.Types.ObjectId(proj.teamId);
          } else {
            const projectTeam = await Team.findOne({
              $or: [{ name: new RegExp('^' + proj.teamId + '$', 'i') }, { key: proj.teamId.toUpperCase() }]
            });
            if (projectTeam) {
              updateDoc.teamId = projectTeam._id;
            }
          }
        }
      } catch {}
    } else {
      updateDoc.projectId = null;
    }
  }
  if (updates.cycleId !== undefined) {
    updateDoc.cycleId = updates.cycleId ? new mongoose.Types.ObjectId(updates.cycleId) : null;
  }
  if (updates.parentId !== undefined) {
    updateDoc.parentId = updates.parentId ? new mongoose.Types.ObjectId(updates.parentId) : null;
  }
  if (updates.labels !== undefined) {
    updateDoc.labels = updates.labels.map((l) => new mongoose.Types.ObjectId(l));
  }

  const updated = await Issue.findOneAndUpdate(filter, updateDoc, { new: true }).populate([
    { path: "teamId", select: "name key icon color" },
    { path: "stateId", select: "name color type position" },
    { path: "assignedTo", select: "name email avatar" },
    { path: "createdBy", select: "name email avatar" },
    { path: "labels", select: "name color" },
    { path: "projectId", select: "name" },
    { path: "cycleId", select: "name number" },
    { path: "parentId", select: "title identifier number" },
  ]);

  return updated;
};

export const deleteIssue = async (idOrKey: string) => {
  const filter = isValidObjectId(idOrKey)
    ? { _id: new mongoose.Types.ObjectId(idOrKey) }
    : { identifier: idOrKey.toUpperCase() };

  return await Issue.findOneAndDelete(filter);
};
