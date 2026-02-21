import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SellerProductsService, Product, ProductImage } from '../../services/seller-products.service';
import { formatCurrency, readFilesAsPreview } from '../../seller-dashboard.utils';

@Component({
  selector: 'app-manage-products',
  standalone: true,
  styleUrl: '../../seller-dashboard.component.css',
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-products.component.html',
})
export class ManageProductsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  isLoading = false;
  productSuccess: string | null = null;
  productError: string | null = null;

  // Filters
  productSearch = '';
  productFilterCategory = '';
  productFilterMinPrice: number | null = null;
  productFilterMaxPrice: number | null = null;
  productFilterStatus = '';

  // Edit modal
  editingProduct: Product | null = null;
  editingProductImages: { file: File; url: string; name: string }[] = [];
  editingProductExistingImages: ProductImage[] = [];

  readonly formatCurrency = formatCurrency;

  constructor(private productsService: SellerProductsService, public router: Router) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.isLoading = true;
    this.productsService.loadAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (products) => {
        this.allProducts = products;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.productError = 'Failed to load products.';
        this.isLoading = false;
      },
    });
  }

  applyFilters(): void {
    this.filteredProducts = this.productsService.filter(
      this.allProducts,
      this.productSearch,
      this.productFilterCategory,
      this.productFilterMinPrice,
      this.productFilterMaxPrice,
      this.productFilterStatus
    );
  }

  clearFilters(): void {
    this.productSearch = '';
    this.productFilterCategory = '';
    this.productFilterMinPrice = null;
    this.productFilterMaxPrice = null;
    this.productFilterStatus = '';
    this.filteredProducts = [...this.allProducts];
  }

  // ── Edit Modal ────────────────────────────────────────────────────────────

  openEdit(product: Product): void {
    this.editingProduct = { ...product };
    this.editingProductImages = [];
    this.editingProductExistingImages = [];
    this.productError = null;
    this.productSuccess = null;

    if (product.product_id) {
      this.productsService.loadImages(product.product_id)
        .pipe(takeUntil(this.destroy$))
        .subscribe((images) => { this.editingProductExistingImages = images; });
    }
  }

  closeEdit(): void {
    this.editingProduct = null;
    this.editingProductImages = [];
    this.editingProductExistingImages = [];
  }

  async onEditFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const previews = await readFilesAsPreview(input.files);
    this.editingProductImages.push(...previews);
    input.value = '';
  }

  removeNewEditImage(index: number): void {
    this.editingProductImages.splice(index, 1);
  }

  removeExistingImage(image: ProductImage): void {
    const imageId = this.productsService.extractImageId(image);
    if (!imageId) { this.productError = 'Cannot delete image: ID not found.'; return; }
    if (!confirm('Delete this image?')) return;

    this.productsService.deleteImage(imageId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.editingProductExistingImages = this.editingProductExistingImages.filter(
          (img) => this.productsService.extractImageId(img) !== imageId
        );
        this.productSuccess = 'Image deleted.';
        setTimeout(() => (this.productSuccess = null), 3000);
      },
      error: () => {
        this.productError = 'Failed to delete image.';
        setTimeout(() => (this.productError = null), 3000);
      },
    });
  }

  onUpdateProduct(): void {
    if (!this.editingProduct?.product_id) return;

    this.productsService.update(this.editingProduct.product_id, {
      product: this.editingProduct,
      newImages: this.editingProductImages.map((i) => i.file),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.productSuccess = 'Product updated successfully!';
        this.closeEdit();
        this.load();
        setTimeout(() => (this.productSuccess = null), 3000);
      },
      error: () => {
        this.productError = 'Failed to update product.';
        setTimeout(() => (this.productError = null), 3000);
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  onDeleteProduct(productId: string): void {
    if (!confirm('Are you sure you want to delete this product?')) return;
    this.productsService.delete(productId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.productSuccess = 'Product deleted successfully!';
        this.load();
        setTimeout(() => (this.productSuccess = null), 3000);
      },
      error: () => {
        this.productError = 'Failed to delete product.';
        setTimeout(() => (this.productError = null), 3000);
      },
    });
  }

  goToAddProduct(): void {
    this.router.navigate(['/seller-dashboard/add-product']);
  }
}