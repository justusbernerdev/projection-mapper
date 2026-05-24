export function renderSolid(surface, ctx) {
  ctx.fillStyle = surface.color;
  ctx.fillRect(0, 0, surface.w, surface.h);
}
