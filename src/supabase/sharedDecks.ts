import { supabase } from "./client";
import type { Card } from "../db/types";

export type SharedDeckCard = {
  front_md: string;
  back_md: string;
  hint_md?: string | null;
  tags: string[];
};

export type SharedDeck = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cards: SharedDeckCard[];
  tag: string | null;
  created_at: string;
};

export const createSharedDeck = async (
  userId: string,
  title: string,
  cards: Card[],
  tag?: string | null,
  description?: string | null,
): Promise<string> => {
  const payload: SharedDeckCard[] = cards.map((card) => ({
    front_md: card.front_md,
    back_md: card.back_md,
    hint_md: card.hint_md ?? null,
    tags: card.tags ?? [],
  }));

  const { data, error } = await supabase
    .from("shared_decks")
    .insert({
      user_id: userId,
      title,
      description: description ?? null,
      cards: payload,
      tag: tag ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
};

export const fetchSharedDeck = async (
  id: string,
): Promise<SharedDeck | null> => {
  const { data, error } = await supabase
    .from("shared_decks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SharedDeck | null;
};
