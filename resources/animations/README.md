# Animation Assets

This directory contains animation assets for answer feedback.

## Animation Types

### 1. Correct Answer Animation
- **File**: `correct.json` (Lottie) or CSS-based fallback
- **Duration**: 1-2 seconds
- **Style**: Professional, positive feedback
- **Trigger**: When user confirms correct answer

### 2. Wrong Answer Animation
- **File**: `wrong.json` (Lottie) or CSS-based fallback
- **Duration**: 1-2 seconds
- **Style**: Clear but not punitive
- **Trigger**: When user confirms wrong answer

## File Formats

### Option 1: Lottie JSON (Recommended)
- Export from After Effects or similar tools
- Place files: `correct.json`, `wrong.json`
- Library: lottie-web

### Option 2: CSS Fallback (Built-in)
- Implemented in `src/renderer/src/assets/animations.css`
- Simple fade/scale effects with color indicators

## Adding New Animations

1. Export animation as Lottie JSON
2. Place in this directory
3. Update `src/renderer/src/services/animationService.ts` if needed
4. Test performance on target hardware

## Guidelines

- Keep animations simple and short (1-2 seconds)
- Avoid elaborate effects that may stutter
- Test on low-end hardware
- Ensure animations don't obscure content
- Maintain professional appearance for formal settings

