// Cache loaded images per surface
const imageCache = new Map();

export function renderImage(surface, ctx) {
  if (!surface.imageUrl) {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, surface.w, surface.h);
    ctx.fillStyle = '#444';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No image', surface.w / 2, surface.h / 2);
    return;
  }

  let img = imageCache.get(surface.id);
  if (!img || img.src !== surface.imageUrl) {
    img = new Image();
    img.src = surface.imageUrl;
    imageCache.set(surface.id, img);
  }

  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, surface.w, surface.h);
  }
}
