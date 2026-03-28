// src/app/admin/admin-portal.utils.ts

export function formatCurrency(amount: number | string | null | undefined): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(n)) return 'KSh 0';
  return new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES', minimumFractionDigits: 0,
  }).format(n).replace('KES', 'KSh');
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-KE', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-KE', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    pending: 'pending', paid: 'delivered', processing: 'processing',
    shipped: 'processing', delivered: 'delivered', cancelled: 'cancelled', failed: 'cancelled',
  };
  return map[status?.toLowerCase()] ?? 'pending';
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending', paid: 'Paid', processing: 'Processing',
    shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', failed: 'Failed',
  };
  return map[status?.toLowerCase()] ?? status ?? 'Unknown';
}

export async function readFilesAsPreview(
  files: FileList,
): Promise<{ file: File; url: string; name: string }[]> {
  const tasks = Array.from(files)
    .filter((f) => f.type.startsWith('image/'))
    .map((file) =>
      new Promise<{ file: File; url: string; name: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e: any) => resolve({ file, url: e.target.result, name: file.name });
        reader.readAsDataURL(file);
      }),
    );
  return Promise.all(tasks);
}