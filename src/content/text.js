// Text content renderer — renders text with web fonts onto surface canvas

export function renderText(surface, ctx) {
  const {
    w, h,
    textContent = '',
    textFont = 'Arial',
    textSize = 48,
    textColor = '#ffffff',
    textAlign = 'center',
    textVerticalAlign = 'middle',
    textBold = false,
    textItalic = false,
    textBgColor = '#000000',
    textBgOpacity = 1,
    textLineHeight = 1.3,
    textStroke = false,
    textStrokeColor = '#000000',
    textStrokeWidth = 2,
  } = surface;

  // Background
  ctx.globalAlpha = textBgOpacity;
  ctx.fillStyle = textBgColor;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;

  if (!textContent) {
    ctx.fillStyle = '#333';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Type text in sidebar', w / 2, h / 2);
    return;
  }

  // Font
  const style = `${textItalic ? 'italic ' : ''}${textBold ? 'bold ' : ''}`;
  ctx.font = `${style}${textSize}px "${textFont}", sans-serif`;
  ctx.textAlign = textAlign;
  ctx.fillStyle = textColor;

  // Word wrap and render
  const lines = wrapText(ctx, textContent, w - 20);
  const lineH = textSize * textLineHeight;
  const totalH = lines.length * lineH;

  let startY;
  if (textVerticalAlign === 'top') startY = textSize;
  else if (textVerticalAlign === 'bottom') startY = h - totalH + textSize;
  else startY = (h - totalH) / 2 + textSize;

  let xPos;
  if (textAlign === 'left') xPos = 10;
  else if (textAlign === 'right') xPos = w - 10;
  else xPos = w / 2;

  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineH;

    if (textStroke) {
      ctx.strokeStyle = textStrokeColor;
      ctx.lineWidth = textStrokeWidth;
      ctx.lineJoin = 'round';
      ctx.strokeText(lines[i], xPos, y);
    }

    ctx.fillText(lines[i], xPos, y);
  }
}

function wrapText(ctx, text, maxWidth) {
  // Support explicit newlines
  const paragraphs = text.split('\n');
  const allLines = [];

  for (const para of paragraphs) {
    const words = para.split(' ');
    let line = '';

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        allLines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    allLines.push(line);
  }

  return allLines;
}
