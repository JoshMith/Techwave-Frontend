// src/app/admin/views/products/admin-products.component.ts

import { Component, OnInit, OnDestroy, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminApiService } from '../../services/admin-api.service';
import { formatCurrency, readFilesAsPreview } from '../../admin-portal.utils';

interface ProductSpec { key: string; value: string; }

interface ProductImage {
  image_url: string;
  alt_text?: string;
  is_primary?: boolean;
  image_id?: string;
  id?: string;
  product_image_id?: string;
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  styleUrls: [
    '../../portal-shared.css',
    '../../admin.component.css',
  ],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-products.component.html',
})
export class AdminProductsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Lists
  allProducts: any[] = [];
  filteredProducts: any[] = [];
  categories: any[] = [];

  // Loading
  isLoading = false;
  isSubmitting = false;
  isLoadingCategories = false;

  // Messages
  successMsg: string | null = null;
  errorMsg: string | null = null;

  // Filters
  searchTerm = '';
  filterCategory = '';
  filterCondition = '';
  filterStatus = '';

  // ── Add product modal ──────────────────────────────────────────────────────
  showAddModal = false;
  newProduct = this.emptyProduct();
  newSpecs: ProductSpec[] = [{ key: '', value: '' }];
  newImages: { file: File; url: string; name: string }[] = [];

  // ── Edit product modal ─────────────────────────────────────────────────────
  editingProduct: any = null;
  editSpecs: ProductSpec[] = [];
  editExistingImages: ProductImage[] = [];
  editNewImages: { file: File; url: string; name: string }[] = [];

  readonly fmt = formatCurrency;

  constructor(
    private adminApi: AdminApiService,
    private cdr: ChangeDetectorRef  // Add ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  ngOnDestroy(): void { 
    this.destroy$.next(); 
    this.destroy$.complete(); 
  }

  // ── Load Categories ────────────────────────────────────────────────────────
  loadCategories(): void {
    this.isLoadingCategories = true;
    this.adminApi.getCategories().pipe(takeUntil(this.destroy$)).subscribe({
      next: (cats) => {
        // console.log('Categories loaded:', cats);
        
        // Ensure we're setting the categories array correctly
        this.categories = Array.isArray(cats) ? cats : [];
        
        // console.log('Categories array after assignment:', this.categories);
        console.log('Number of categories:', this.categories.length);
        
        this.isLoadingCategories = false;
        
        // Force change detection
        this.cdr.detectChanges();
        
        if (this.categories.length === 0) {
          console.warn('No categories returned from API');
          this.errorMsg = 'No categories found. Please add categories first.';
          setTimeout(() => this.errorMsg = null, 5000);
        }
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.errorMsg = 'Failed to load categories. Please check your connection.';
        this.isLoadingCategories = false;
        this.categories = [];
        this.cdr.detectChanges();
        
        setTimeout(() => {
          if (this.errorMsg === 'Failed to load categories. Please check your connection.') {
            this.errorMsg = null;
          }
        }, 5000);
      }
    });
  }

  // ── Load Products ──────────────────────────────────────────────────────────
  loadProducts(): void {
    this.isLoading = true;
    this.adminApi.getProducts().pipe(takeUntil(this.destroy$)).subscribe({
      next: (products) => {
        this.allProducts = Array.isArray(products) ? products : [];
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load products:', err);
        this.errorMsg = 'Failed to load products.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredProducts = this.allProducts.filter(p => {
      if (term && !`${p.title} ${p.description}`.toLowerCase().includes(term)) return false;
      if (this.filterCategory && String(p.category_id) !== String(this.filterCategory)) return false;
      if (this.filterCondition && p.condition !== this.filterCondition) return false;
      if (this.filterStatus) {
        const st = (p.status ?? 'active').toLowerCase();
        if (st !== this.filterStatus) return false;
      }
      return true;
    });
    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.searchTerm = ''; 
    this.filterCategory = ''; 
    this.filterCondition = ''; 
    this.filterStatus = '';
    this.applyFilters();
  }

  // ── Add product ────────────────────────────────────────────────────────────
  openAdd(): void {
    this.newProduct = this.emptyProduct();
    this.newSpecs   = [{ key: '', value: '' }];
    this.newImages  = [];
    this.successMsg = null; 
    this.errorMsg = null;
    this.showAddModal = true;
    this.cdr.detectChanges();
  }

  closeAdd(): void { 
    this.showAddModal = false;
    this.cdr.detectChanges();
  }

  addSpec(): void { 
    this.newSpecs.push({ key: '', value: '' });
    this.cdr.detectChanges();
  }
  
  removeSpec(i: number): void { 
    if (this.newSpecs.length > 1) {
      this.newSpecs.splice(i, 1);
      this.cdr.detectChanges();
    }
  }

  async onNewFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const previews = await readFilesAsPreview(input.files);
    this.newImages.push(...previews);
    input.value = '';
    this.cdr.detectChanges();
  }

  async onNewDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
    if (!event.dataTransfer?.files.length) return;
    const previews = await readFilesAsPreview(event.dataTransfer.files);
    this.newImages.push(...previews);
    this.cdr.detectChanges();
  }

  onDragOver(e: DragEvent): void { 
    e.preventDefault(); 
    (e.currentTarget as HTMLElement).classList.add('drag-over'); 
  }
  
  onDragLeave(e: DragEvent): void { 
    e.preventDefault(); 
    (e.currentTarget as HTMLElement).classList.remove('drag-over'); 
  }

  removeNewImage(i: number): void { 
    this.newImages.splice(i, 1);
    this.cdr.detectChanges();
  }

  submitAdd(): void {
    const err = this.validateProduct(this.newProduct);
    if (err) { 
      this.errorMsg = err; 
      this.cdr.detectChanges();
      return; 
    }

    this.isSubmitting = true;
    this.errorMsg = null;
    this.cdr.detectChanges();

    const specsObj: Record<string, string> = {};
    this.newSpecs.forEach(s => { 
      if (s.key.trim() && s.value.trim()) {
        specsObj[s.key.trim()] = s.value.trim();
      }
    });

    const payload = {
      category_id:  this.newProduct.category_id,
      title:        this.newProduct.title,
      description:  this.newProduct.description,
      price:        Number(this.newProduct.price),
      sale_price:   this.newProduct.sale_price ? Number(this.newProduct.sale_price) : null,
      stock:        Number(this.newProduct.stock),
      condition:    this.newProduct.condition,
      specs:        JSON.stringify(specsObj),
    };

    this.adminApi.createProduct(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (productId) => {
        if (this.newImages.length > 0) {
          const fd = new FormData();
          this.newImages.forEach(i => fd.append('images', i.file));
          fd.append('setPrimary', 'true');
          fd.append('altText', this.newProduct.title);
          this.adminApi.uploadProductImages(productId, fd).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.finishAdd(),
            error: () => this.finishAdd('Product created but image upload failed.'),
          });
        } else {
          this.finishAdd();
        }
      },
      error: (e) => { 
        this.errorMsg = e?.error?.message ?? 'Failed to create product.'; 
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  private finishAdd(warning?: string): void {
    this.isSubmitting = false;
    this.successMsg = warning ?? 'Product added successfully!';
    this.closeAdd();
    this.loadProducts();
    setTimeout(() => {
      this.successMsg = null;
      this.cdr.detectChanges();
    }, 4000);
  }

  // ── Edit product ───────────────────────────────────────────────────────────
  openEdit(product: any): void {
    this.editingProduct = { ...product };
    this.editNewImages = [];
    this.editExistingImages = [];
    this.successMsg = null; 
    this.errorMsg = null;

    // Parse specs from JSON string or object
    const rawSpecs = product.specs;
    if (typeof rawSpecs === 'object' && rawSpecs !== null) {
      const specsEntries = Object.entries(rawSpecs);
      this.editSpecs = specsEntries.length > 0 
        ? specsEntries.map(([key, value]) => ({ key, value: String(value) }))
        : [{ key: '', value: '' }];
    } else {
      this.editSpecs = [{ key: '', value: '' }];
    }

    if (product.product_id) {
      this.adminApi.getProductImages(String(product.product_id))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (imgs) => {
            this.editExistingImages = imgs || [];
            this.cdr.detectChanges();
          },
          error: (err) => console.error('Failed to load images:', err)
        });
    }
    this.cdr.detectChanges();
  }

  closeEdit(): void { 
    this.editingProduct = null;
    this.cdr.detectChanges();
  }

  addEditSpec(): void { 
    this.editSpecs.push({ key: '', value: '' });
    this.cdr.detectChanges();
  }
  
  removeEditSpec(i: number): void { 
    if (this.editSpecs.length > 1) {
      this.editSpecs.splice(i, 1);
      this.cdr.detectChanges();
    }
  }

  async onEditFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const previews = await readFilesAsPreview(input.files);
    this.editNewImages.push(...previews);
    input.value = '';
    this.cdr.detectChanges();
  }

  removeEditNewImage(i: number): void { 
    this.editNewImages.splice(i, 1);
    this.cdr.detectChanges();
  }

  removeEditExistingImage(img: ProductImage): void {
    const id = img.image_id ?? img.id ?? img.product_image_id;
    if (!id || !confirm('Delete this image?')) return;
    this.adminApi.deleteProductImage(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.editExistingImages = this.editExistingImages.filter(i =>
          (i.image_id ?? i.id ?? i.product_image_id) !== id);
        this.cdr.detectChanges();
      },
      error: (err) => { 
        console.error('Failed to delete image:', err);
        this.errorMsg = 'Failed to delete image.'; 
        this.cdr.detectChanges();
      },
    });
  }

  submitEdit(): void {
    if (!this.editingProduct?.product_id) return;
    const err = this.validateProduct(this.editingProduct);
    if (err) { 
      this.errorMsg = err; 
      this.cdr.detectChanges();
      return; 
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const specsObj: Record<string, string> = {};
    this.editSpecs.forEach(s => { 
      if (s.key.trim() && s.value.trim()) {
        specsObj[s.key.trim()] = s.value.trim();
      }
    });

    const payload: any = {
      category_id:  this.editingProduct.category_id,
      title:        this.editingProduct.title,
      description:  this.editingProduct.description,
      price:        Number(this.editingProduct.price),
      sale_price:   this.editingProduct.sale_price ? Number(this.editingProduct.sale_price) : null,
      stock:        Number(this.editingProduct.stock),
      condition:    this.editingProduct.condition,
      specs:        JSON.stringify(specsObj),
    };

    this.adminApi.updateProduct(String(this.editingProduct.product_id), payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (this.editNewImages.length > 0) {
            const fd = new FormData();
            this.editNewImages.forEach(i => fd.append('images', i.file));
            fd.append('altText', this.editingProduct.title);
            this.adminApi.uploadProductImages(String(this.editingProduct.product_id), fd)
              .pipe(takeUntil(this.destroy$)).subscribe({ 
                next: () => this.finishEdit(), 
                error: (err) => {
                  console.error('Image upload failed:', err);
                  this.finishEdit('Saved but image upload failed.');
                }
              });
          } else {
            this.finishEdit();
          }
        },
        error: (e) => { 
          this.errorMsg = e?.error?.message ?? 'Failed to update product.'; 
          this.isSubmitting = false;
          this.cdr.detectChanges();
        },
      });
  }

  private finishEdit(warning?: string): void {
    this.isSubmitting = false;
    this.successMsg = warning ?? 'Product updated successfully!';
    this.closeEdit();
    this.loadProducts();
    setTimeout(() => {
      this.successMsg = null;
      this.cdr.detectChanges();
    }, 4000);
  }

  // ── Delete product ─────────────────────────────────────────────────────────
  deleteProduct(product: any): void {
    if (!confirm(`Delete "${product.title}"? This hides it from the store but preserves order history.`)) return;
    this.adminApi.deleteProduct(String(product.product_id)).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { 
        this.successMsg = 'Product deleted.'; 
        this.loadProducts(); 
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (e) => { 
        this.errorMsg = e?.error?.message ?? 'Failed to delete product.'; 
        this.cdr.detectChanges();
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private emptyProduct() {
    return { 
      category_id: '', 
      title: '', 
      description: '', 
      price: 0, 
      sale_price: null as number | null, 
      stock: 0, 
      condition: 'new' as 'new' | 'ex_uk' 
    };
  }

  private validateProduct(p: any): string | null {
    if (!p.title?.trim())       return 'Product title is required.';
    if (!p.description?.trim()) return 'Description is required.';
    if (!p.category_id)         return 'Please select a category.';
    if ((p.price ?? 0) <= 0)   return 'Price must be greater than 0.';
    if ((p.stock ?? 0) < 0)    return 'Stock cannot be negative.';
    if (p.sale_price && Number(p.sale_price) >= Number(p.price)) {
      return 'Sale price must be less than regular price.';
    }
    return null;
  }

  getCategoryName(categoryId: any): string {
    if (!this.categories || this.categories.length === 0) {
      return '—';
    }
    const cat = this.categories.find(c => String(c.category_id) === String(categoryId));
    return cat?.name ?? '—';
  }

  reloadCategories(): void {
    this.loadCategories();
  }
}