export type SessionCard = {
  cardId: number;
  front: string;
  back: string;
  hint: string | null;
  tags: string[];
  wasReversed: boolean;
};
