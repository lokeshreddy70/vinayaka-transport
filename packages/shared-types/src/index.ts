export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "BRANCH_MANAGER"
  | "COUNTER_STAFF"
  | "DISPATCHER"
  | "RIDER"
  | "ACCOUNTANT";

export type OrderStatus =
  | "BOOKED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED";

export interface TrackingEvent {
  id: string;
  orderId: string;
  status: OrderStatus;
  message: string;
  createdAt: string;
}
