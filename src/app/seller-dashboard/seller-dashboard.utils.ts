/** Shared formatting helpers — mirrors original component methods */

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  })
    .format(amount)
    .replace('KES', 'KSh');
}

export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function readFilesAsPreview(
  files: FileList
): Promise<{ file: File; url: string; name: string }[]> {
  const tasks = Array.from(files)
    .filter((f) => f.type.startsWith('image/'))
    .map(
      (file) =>
        new Promise<{ file: File; url: string; name: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e: any) =>
            resolve({ file, url: e.target.result, name: file.name });
          reader.readAsDataURL(file);
        })
    );
  return Promise.all(tasks);
}