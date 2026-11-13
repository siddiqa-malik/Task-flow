import mongoose from "mongoose";
import { Cycle, ICycle } from "./cycle.model.js";

export const getCyclesByTeam = async (teamId: string, status?: string) => {
  const filter: any = { teamId: new mongoose.Types.ObjectId(teamId) };
  if (status) {
    filter.status = status;
  }
  return await Cycle.find(filter).sort({ number: -1 });
};

export const getCycleById = async (id: string) => {
  return await Cycle.findById(id);
};

export const createCycle = async (data: {
  teamId: string;
  workspaceId: string;
  name?: string;
  description?: string;
  startsAt: Date | string;
  endsAt: Date | string;
}) => {
  const tId = new mongoose.Types.ObjectId(data.teamId);
  const wId = new mongoose.Types.ObjectId(data.workspaceId);

  // Find latest cycle number for this team
  const lastCycle = await Cycle.findOne({ teamId: tId }).sort({ number: -1 });
  const nextNumber = (lastCycle?.number || 0) + 1;

  const cycle = await Cycle.create({
    teamId: tId,
    workspaceId: wId,
    number: nextNumber,
    name: data.name?.trim() || `Cycle ${nextNumber}`,
    description: data.description?.trim(),
    startsAt: new Date(data.startsAt),
    endsAt: new Date(data.endsAt),
    status: "upcoming",
  });

  return cycle;
};

export const updateCycle = async (
  id: string,
  data: Partial<{
    name: string;
    description: string;
    startsAt: Date | string;
    endsAt: Date | string;
    status: "upcoming" | "active" | "completed";
  }>
) => {
  const updateData: any = { ...data };
  if (data.status === "completed") {
    updateData.completedAt = new Date();
  }
  return await Cycle.findByIdAndUpdate(id, updateData, { new: true });
};

export const deleteCycle = async (id: string) => {
  return await Cycle.findByIdAndDelete(id);
};
