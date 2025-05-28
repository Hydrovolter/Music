function applyColors(color) {
    if (!color || !Array.isArray(color) || color.length < 3) {
      return;
    }
  
    targetColor = { r: color[0], g: color[1], b: color[2] };
  
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  
    applyAnimation();
  }
  
  function applyAnimation() {
    const dr = (targetColor.r - currentColor.r) * 0.1;
    const dg = (targetColor.g - currentColor.g) * 0.1;
    const db = (targetColor.b - currentColor.b) * 0.1;
  
    currentColor.r += dr;
    currentColor.g += dg;
    currentColor.b += db;
  
    const r = Math.round(currentColor.r);
    const g = Math.round(currentColor.g);
    const b = Math.round(currentColor.b);
  
    const darkenAmount = 30;
    const endR = Math.max(0, r - darkenAmount);
    const endG = Math.max(0, g - darkenAmount);
    const endB = Math.max(0, b - darkenAmount);
  
    document.documentElement.style.setProperty(
      "--bg-start",
      `rgb(${r}, ${g}, ${b})`
    );
    document.documentElement.style.setProperty(
      "--bg-end",
      `rgb(${endR}, ${endG}, ${endB})`
    );
  
    const tolerance = 0.5;
    if (
      Math.abs(targetColor.r - currentColor.r) > tolerance ||
      Math.abs(targetColor.g - currentColor.g) > tolerance ||
      Math.abs(targetColor.b - currentColor.b) > tolerance
    ) {
      animationId = requestAnimationFrame(applyAnimation);
    } else {
      currentColor = { ...targetColor };
    }
  }
  