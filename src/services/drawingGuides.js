export function getSymmetrySegments(start, end, width, height, mode = "none") {
  const centerX = width / 2;
  const centerY = height / 2;
  const reflectX = (point) => ({ x: width - point.x, y: point.y });
  const reflectY = (point) => ({ x: point.x, y: height - point.y });
  const rotate = (point, angle) => {
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    return {
      x: centerX + dx * Math.cos(angle) - dy * Math.sin(angle),
      y: centerY + dx * Math.sin(angle) + dy * Math.cos(angle),
    };
  };

  if (mode === "radial-6" || mode === "radial-8") {
    const count = mode === "radial-6" ? 6 : 8;
    return Array.from({ length: count }, (_, index) => {
      const angle = (index * Math.PI * 2) / count;
      return [rotate(start, angle), rotate(end, angle)];
    });
  }

  const reflectAcrossX = mode === "vertical" || mode === "both";
  const reflectAcrossY = mode === "horizontal" || mode === "both";
  const segments = [[start, end]];
  if (reflectAcrossX) segments.push([reflectX(start), reflectX(end)]);
  if (reflectAcrossY) segments.push([reflectY(start), reflectY(end)]);
  if (reflectAcrossX && reflectAcrossY) {
    segments.push([reflectY(reflectX(start)), reflectY(reflectX(end))]);
  }
  return segments;
}

export function getPerspectiveGuideLines(mode, width = 1000, height = 580) {
  if (mode === "one-point") {
    const vanishingPoint = { x: width / 2, y: height / 2 };
    const anchors = [
      { x: 0, y: 0 },
      { x: width / 2, y: 0 },
      { x: width, y: 0 },
      { x: 0, y: height / 2 },
      { x: width, y: height / 2 },
      { x: 0, y: height },
      { x: width / 2, y: height },
      { x: width, y: height },
    ];
    return anchors.map((point) => [point, vanishingPoint]);
  }

  if (mode === "two-point" || mode === "three-point") {
    const left = { x: -width * 0.4, y: height / 2 };
    const right = { x: width * 1.4, y: height / 2 };
    const corners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: 0, y: height },
      { x: width, y: height },
    ];
    const lines = [
      ...corners.map((corner) => [left, corner]),
      ...corners.map((corner) => [right, corner]),
    ];
    if (mode === "three-point") {
      const top = { x: width / 2, y: -height * 0.9 };
      lines.push(...corners.map((corner) => [top, corner]));
    }
    return lines;
  }

  return [];
}
