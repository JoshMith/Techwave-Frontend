// src/app/shared/image-lightbox/image-lightbox.component.ts

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface LightboxImage {
  src: string;
  alt?: string;
}

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-lightbox.component.html',
  styleUrls: ['./image-lightbox.component.css'],
})
export class ImageLightboxComponent implements OnInit, OnDestroy {
  @Input() images: LightboxImage[] = [];
  @Input() startIndex: number = 0;
  @Output() closed = new EventEmitter<void>();

  @ViewChild('imgEl') imgEl!: ElementRef<HTMLImageElement>;

  currentIndex: number = 0;
  isLoading: boolean = true;
  isDownloading: boolean = false;

  // ── Zoom / Pan state ──────────────────────────────────────────────────────
  scale: number = 1;
  readonly MIN_SCALE = 1;
  readonly MAX_SCALE = 4;
  readonly ZOOM_STEP = 0.4;

  translateX: number = 0;
  translateY: number = 0;

  // Mouse drag
  isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragOriginX: number = 0;
  private dragOriginY: number = 0;

  // Touch pinch
  private lastPinchDistance: number = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.currentIndex = Math.max(0, Math.min(this.startIndex, this.images.length - 1));
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':  this.prev(); break;
      case 'ArrowRight': this.next(); break;
      case 'Escape':     this.close(); break;
      case '+':          this.zoomIn(); break;
      case '-':          this.zoomOut(); break;
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  get currentImage(): LightboxImage {
    return this.images[this.currentIndex] || { src: '', alt: '' };
  }

  prev(): void {
    if (this.images.length < 2) return;
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.resetZoom();
  }

  next(): void {
    if (this.images.length < 2) return;
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.resetZoom();
  }

  goTo(index: number): void {
    if (index === this.currentIndex) return;
    this.currentIndex = index;
    this.resetZoom();
  }

  close(): void {
    this.closed.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    // Only close if the backdrop itself was clicked (not the image or controls)
    if ((event.target as HTMLElement).classList.contains('lb-overlay')) {
      this.close();
    }
  }

  onImageLoad(): void {
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  onImageLoadStart(): void {
    this.isLoading = true;
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────
  zoomIn(): void {
    this.scale = Math.min(this.MAX_SCALE, +(this.scale + this.ZOOM_STEP).toFixed(2));
  }

  zoomOut(): void {
    this.scale = Math.max(this.MIN_SCALE, +(this.scale - this.ZOOM_STEP).toFixed(2));
    if (this.scale === this.MIN_SCALE) this.resetTranslation();
  }

  resetZoom(): void {
    this.scale = 1;
    this.resetTranslation();
    this.isLoading = true;
  }

  private resetTranslation(): void {
    this.translateX = 0;
    this.translateY = 0;
  }

  get imageTransform(): string {
    return `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  // ── Mouse wheel zoom ──────────────────────────────────────────────────────
  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) this.zoomIn();
    else this.zoomOut();
  }

  // ── Mouse drag (when zoomed) ──────────────────────────────────────────────
  onMouseDown(event: MouseEvent): void {
    if (this.scale <= 1) return;
    event.preventDefault();
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragOriginX = this.translateX;
    this.dragOriginY = this.translateY;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    this.translateX = this.dragOriginX + (event.clientX - this.dragStartX);
    this.translateY = this.dragOriginY + (event.clientY - this.dragStartY);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
  }

  // ── Touch pinch-to-zoom ───────────────────────────────────────────────────
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      this.lastPinchDistance = this.getPinchDistance(event.touches);
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 2) {
      event.preventDefault();
      const distance = this.getPinchDistance(event.touches);
      const delta = distance - this.lastPinchDistance;
      this.lastPinchDistance = distance;
      const newScale = this.scale + delta * 0.01;
      this.scale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, +newScale.toFixed(2)));
      if (this.scale === this.MIN_SCALE) this.resetTranslation();
    }
  }

  private getPinchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Download ──────────────────────────────────────────────────────────────
  async downloadImage(): Promise<void> {
    const url = this.currentImage.src;
    if (!url) return;

    this.isDownloading = true;

    try {
      // Fetch as blob — works for cross-origin (S3, CDN) images
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error('Fetch failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      // Derive filename from URL path or fall back to product-image.jpg
      const parts = url.split('/');
      link.download = parts[parts.length - 1] || 'product-image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback: open in new tab so the user can manually save
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      this.isDownloading = false;
      this.cdr.detectChanges();
    }
  }
}
