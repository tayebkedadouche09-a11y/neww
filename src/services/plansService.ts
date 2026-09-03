/**
 * plansService — VYBE Plans + their timeline items.
 * RLS: owner writes; world can read public plans.
 */
import { supabase } from '../lib/supabase';
import { PlanItem, VybePlan } from '../types';
import { DbPlanItemRow, DbPlanRow, newUuid, rowToPlan } from './mappers';

const assertBackend = () => {
  if (!supabase) throw new Error('VYBE backend is not configured');
  return supabase;
};

function planItemToRow(planId: string, item: PlanItem) {
  return {
    id: item.id || newUuid(),
    plan_id: planId,
    place_id: item.placeId,
    start_time: item.startTime,
    duration: item.durationMinutes,
    notes: item.customNote ?? null,
    sort_order: item.order
  };
}

export const plansService = {
  async list(userId: string): Promise<VybePlan[]> {
    const db = assertBackend();
    const { data, error } = await db
      .from('plans')
      .select('*, plan_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as unknown as Array<DbPlanRow & { plan_items: DbPlanItemRow[] | null }>)
      .map(row => rowToPlan(row, row.plan_items ?? []));
  },

  async getPublic(planId: string): Promise<VybePlan | null> {
    const db = assertBackend();
    const { data, error } = await db
      .from('plans')
      .select('*, plan_items(*)')
      .eq('id', planId)
      .eq('is_public', true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as unknown as DbPlanRow & { plan_items: DbPlanItemRow[] | null };
    return rowToPlan(row, row.plan_items ?? []);
  },

  async create(plan: VybePlan): Promise<void> {
    const db = assertBackend();
    const { error } = await db.from('plans').insert({
      id: plan.id,
      user_id: plan.userId,
      title: plan.title,
      date: plan.date,
      mood: plan.mood,
      budget: plan.targetBudgetUsd,
      cover_image: plan.coverImage ?? null,
      is_public: plan.isPublic
    });
    if (error) throw error;
  },

  async addItem(planId: string, item: PlanItem): Promise<void> {
    const db = assertBackend();
    const { error } = await db.from('plan_items').upsert(
      planItemToRow(planId, item),
      { ignoreDuplicates: true, onConflict: 'id' }
    );
    if (error) throw error;
  },

  async removeItem(planItemId: string): Promise<void> {
    const db = assertBackend();
    const { error } = await db.from('plan_items').delete().eq('id', planItemId);
    if (error) throw error;
  },

  async updateItem(planItemId: string, updates: { startTime?: string; customNote?: string; durationMinutes?: number }): Promise<void> {
    const db = assertBackend();
    const patch: Record<string, unknown> = {};
    if (updates.startTime !== undefined) patch.start_time = updates.startTime;
    if (updates.customNote !== undefined) patch.notes = updates.customNote;
    if (updates.durationMinutes !== undefined) patch.duration = updates.durationMinutes;
    const { error } = await db.from('plan_items').update(patch).eq('id', planItemId);
    if (error) throw error;
  },

  async remove(planId: string): Promise<void> {
    const db = assertBackend();
    const { error } = await db.from('plans').delete().eq('id', planId);
    if (error) throw error;
  }
};
