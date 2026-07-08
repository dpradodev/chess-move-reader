export type Orientation = 'white' | 'black';
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface BoardMoveAttempt {
  from: string;
  to: string;
  /** Present only when the move required a promotion choice. */
  promotion?: PromotionPiece;
}

export interface PendingPromotion {
  from: string;
  to: string;
  color: 'w' | 'b';
}

export interface DrawableArrow {
  from: string;
  to: string;
}

export interface DrawableCircle {
  square: string;
}
