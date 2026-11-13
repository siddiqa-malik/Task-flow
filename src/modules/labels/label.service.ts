import mongoose from "mongoose";
import { Label, ILabel } from "./label.model.js";

export const DEFAULT_LABELS = [
  { name: "Bug", color: "#eb5757", description: "Something isn't working" },
  { name: "Feature", color: "#bb87fc", description: "New functionality" },
  { name: "Improvement", color: "#4ea7fc", description: "Enhancement to existing functionality" },
  { name: "Design", color: "#f2994a", description: "Design and UI tasks" },
  { name: "Documentation", color: "#6fcf97", description: "Documentation updates" },
];

export const getLabels = async (workspaceId: string, teamId?: string) => {
  const wId = new mongoose.Types.ObjectId(workspaceId);
  const filter: any = { workspaceId: wId };

  if (teamId) {
    filter.$or = [
      { teamId: new mongoose.Types.ObjectId(teamId) },
      { teamId: { $exists: false } },
      { teamId: null },
    ];
  }

  let labels = await Label.find(filter).sort({ name: 1 });

  // If no labels in workspace yet, auto-seed defaults
  if (labels.length === 0) {
    const toInsert = DEFAULT_LABELS.map((item) => ({
      ...item,
      workspaceId: wId,
    }));
    labels = await Label.insertMany(toInsert);
  }

  return labels;
};

export const createLabel = async (data: {
  workspaceId: string;
  teamId?: string;
  name: string;
  color?: string;
  description?: string;
}) => {
  const label = await Label.create({
    workspaceId: new mongoose.Types.ObjectId(data.workspaceId),
    teamId: data.teamId ? new mongoose.Types.ObjectId(data.teamId) : undefined,
    name: data.name.trim(),
    color: data.color || "#bb87fc",
    description: data.description?.trim(),
  });
  return label;
};

export const updateLabel = async (
  id: string,
  data: Partial<{ name: string; color: string; description: string }>
) => {
  return await Label.findByIdAndUpdate(id, data, { new: true });
};

export const deleteLabel = async (id: string) => {
  return await Label.findByIdAndDelete(id);
};
