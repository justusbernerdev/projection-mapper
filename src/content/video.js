export function renderVideo(surface, ctx) {
  if (!surface.videoElement) {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, surface.w, surface.h);
    ctx.fillStyle = '#444';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No video', surface.w / 2, surface.h / 2);
    return;
  }

  const video = surface.videoElement;
  if (video.readyState >= 2) {
    ctx.drawImage(video, 0, 0, surface.w, surface.h);
  }
}

export function loadVideo(surface, file) {
  if (surface.videoElement) {
    surface.videoElement.pause();
    URL.revokeObjectURL(surface.videoElement.src);
  }

  const video = document.createElement('video');
  video.src = URL.createObjectURL(file);
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.play();

  surface.videoElement = video;
  surface.videoUrl = file.name;
}
