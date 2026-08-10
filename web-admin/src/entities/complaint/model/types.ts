export interface Complaint {
  id: string;
  orderId: string;
  regionId: string;
  authorId: string;
  authorName: string | null;
  authorPhone: string;
  target: string;
  rating: number;
  text: string | null;
  tags: string[];
  createdAt: string;
  orderPickupAddress: string | null;
  orderStatus: string | null;
}
