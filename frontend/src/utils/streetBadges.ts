export const drawLeafBadge = (ctx: CanvasRenderingContext2D, temp: number, index: number) => {
  ctx.clearRect(0, 0, 320, 140);
  ctx.save();

  // 라운드 박스 배경
  ctx.beginPath();
  ctx.roundRect(10, 10, 300, 110, 24);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = temp > 32.0 ? '#ff4d4f' : '#22c55e';
  ctx.stroke();

  // 텍스트 라벨
  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`🌴 가로수 #${index + 1}`, 30, 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(`${temp.toFixed(1)}°C`, 30, 96);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('그늘차광', 290, 88);

  ctx.restore();
};