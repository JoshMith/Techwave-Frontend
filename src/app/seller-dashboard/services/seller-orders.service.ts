import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

export interface RawOrder {
  order_id: string;
  user_id?: string;
  address_id?: string;
  user_name?: string;
  product_name?: string;
  total_amount?: number;
  total?: number;
  status: string;
  created_at?: string;
  orderDate?: string;
  items?: any[];
  customer?: any;
}

export interface OrderDetails {
  order: RawOrder;
  user: any | null;
  address: any | null;
  items: any[];
  payment: any | null;
}

@Injectable({ providedIn: 'root' })
export class SellerOrdersService {
  constructor(private api: ApiService) {}

  loadAll(): Observable<RawOrder[]> {
    return this.api.getOrders().pipe(
      map((res) => (Array.isArray(res) ? res : [])),
      catchError(() => of([]))
    );
  }

  /**
   * Replicates the forkJoin logic from onOrderClick() in the monolith.
   * Loads the order + user + address + order items + payment in parallel.
   */
  loadDetails(orderId: string): Observable<OrderDetails> {
    return this.api.getOrderById(orderId).pipe(
      switchMap((order: RawOrder) => {
        return forkJoin({
          user: order.user_id
            ? this.api.getUserById(order.user_id).pipe(catchError(() => of(null)))
            : of(null),
          address: order.address_id
            ? this.api.getAddressById(order.address_id).pipe(catchError(() => of(null)))
            : of(null),
          orderItems: this.api.getOrderItems().pipe(catchError(() => of({ data: [] }))),
          payment: this.api.getPayments().pipe(catchError(() => of({ data: [] }))),
        }).pipe(
          map(({ user, address, orderItems, payment }) => {
            const allItems = orderItems.data ?? orderItems ?? [];
            const items = allItems.filter(
              (item: any) =>
                item.order_id === orderId ||
                item.order_id === order.order_id
            );

            const allPayments = payment.data ?? payment ?? [];
            const found = allPayments.find(
              (p: any) =>
                p.order_id === orderId ||
                p.order_id === order.order_id
            ) ?? null;

            return { order, user, address, items, payment: found } as OrderDetails;
          })
        );
      })
    );
  }

  updateStatus(orderId: string, status: string): Observable<void> {
    return this.api.updateOrder(orderId, { status }).pipe(map(() => void 0));
  }

  filter(orders: RawOrder[], statusFilter: string, searchTerm: string): RawOrder[] {
    let result = [...orders];

    if (statusFilter !== 'all') {
      result = result.filter(
        (o) => (o.status ?? '').toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((o) => {
        const id = String(o.order_id ?? '').toLowerCase();
        const customer = (o.user_name ?? o.customer?.name ?? '').toLowerCase();
        const product = (o.product_name ?? o.items?.[0]?.productName ?? '').toLowerCase();
        return id.includes(term) || customer.includes(term) || product.includes(term);
      });
    }

    return result;
  }

  mapStatus(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pending',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      returned: 'Returned',
    };
    return map[status?.toLowerCase()] ?? status ?? 'Unknown';
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'pending',
      processing: 'processing',
      shipped: 'processing',
      delivered: 'delivered',
      cancelled: 'cancelled',
      returned: 'cancelled',
    };
    return map[status?.toLowerCase()] ?? 'pending';
  }
}