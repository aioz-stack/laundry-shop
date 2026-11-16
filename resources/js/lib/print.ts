/**
 * Opens the printable receipt in a new window. Browser printing for now;
 * the receipt endpoint returns structured data so an ESC/POS driver can be
 * swapped in later without touching the screens that call this.
 */
export function openReceipt(orderId: number, autoPrint = true) {
  const url = `${window.location.origin}/print/receipt/${orderId}${autoPrint ? '?autoprint=1' : ''}`;
  const win = window.open(url, `receipt-${orderId}`, 'width=420,height=760');
  if (!win) window.location.assign(url);
}
