import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SellerProductsService, Category, Product, ProductSpec } from '../../services/seller-products.service';
import { SellerAuthService } from '../../services/seller-auth.service';
import { readFilesAsPreview } from '../../seller-dashboard.utils';

@Component({
  selector: 'app-add-product',
  standalone: true,
  styleUrl: '../../seller-dashboard.component.css',
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-product.component.html',
})
export class AddProductComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  categories: Category[] = [];
  productError: string | null = null;
  productSuccess: string | null = null;
  isSubmitting = false;

  newProduct: Partial<Product> = {
    category_id: '', title: '', description: '',
    price: 0, sale_price: undefined, stock: 0,
  };

  specs: ProductSpec[] = [{ key: '', value: '' }];
  uploadedImages: { file: File; url: string; name: string }[] = [];

  constructor(
    private productsService: SellerProductsService,
    private auth: SellerAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productsService.loadCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe((cats) => (this.categories = cats));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addSpecification(): void { this.specs.push({ key: '', value: '' }); }

  removeSpecification(index: number): void {
    if (this.specs.length > 1) this.specs.splice(index, 1);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const previews = await readFilesAsPreview(input.files);
    this.uploadedImages.push(...previews);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
    if (!event.dataTransfer?.files.length) return;
    const previews = await readFilesAsPreview(event.dataTransfer.files);
    this.uploadedImages.push(...previews);
  }

  removeImage(index: number): void { this.uploadedImages.splice(index, 1); }

  onAddProduct(): void {
    this.productError = null;

    if (this.uploadedImages.length === 0) {
      this.productError = 'At least one product image is required.';
      return;
    }

    const validationError = this.productsService.validate(this.newProduct);
    if (validationError) { this.productError = validationError; return; }

    const sellerId = this.auth.sellerId;
    if (!sellerId) { this.productError = 'Seller session expired. Please log in again.'; return; }

    this.isSubmitting = true;

    this.productsService.create({
      sellerId,
      product: this.newProduct as Omit<Product, 'product_id' | 'seller_id'>,
      specs: this.specs.filter((s) => s.key.trim() && s.value.trim()),
      images: this.uploadedImages.map((i) => i.file),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.productSuccess = 'Product and images added successfully!';
        this.reset();
        this.isSubmitting = false;
        setTimeout(() => {
          this.productSuccess = null;
          this.router.navigate(['/seller-dashboard/products']);
        }, 2000);
      },
      error: (err) => {
        this.productError = err?.message ?? 'Failed to create product. Please try again.';
        this.isSubmitting = false;
      },
    });
  }

  cancel(): void { this.router.navigate(['/seller-dashboard/products']); }

  private reset(): void {
    this.newProduct = { category_id: '', title: '', description: '', price: 0, sale_price: undefined, stock: 0 };
    this.specs = [{ key: '', value: '' }];
    this.uploadedImages = [];
  }
}