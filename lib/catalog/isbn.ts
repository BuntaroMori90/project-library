/** EAN-13 book barcode, including its check digit. */
export function isbnFromBarcode(value: string): string | null {
  const isbn = value.replace(/[\s-]/g, "");
  if (!/^(978|979)\d{10}$/.test(isbn)) return null;
  const sum = [...isbn.slice(0, 12)].reduce(
    (total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1),
    0,
  );
  return (10 - (sum % 10)) % 10 === Number(isbn[12]) ? isbn : null;
}
