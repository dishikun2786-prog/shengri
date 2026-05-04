# Anime.js v4 Reference Guide for AI Assistants

## CRITICAL: ALWAYS USE ANIME.JS V4 SYNTAX

**This project uses Anime.js v4.x.x - DO NOT use v3 syntax under any circumstances**

**If you're about to write `import anime from 'animejs'` - STOP!**
**That's v3. This project uses v4. Use the correct import below.**

## Quick Start - Essential Setup

### 1. Correct v4 Import (REQUIRED)
```javascript
// CORRECT v4 imports
import { animate, createTimeline, stagger, utils, svg, eases, engine } from 'animejs';

// WRONG v3 import - NEVER USE THIS
// import anime from 'animejs';
```

### 2. Configure Time Units to Seconds (SET ONCE IN APP ENTRY POINT)
```javascript
import { engine } from 'animejs';

// Set ONLY in the app's entry point, NOT in components
engine.timeUnit = 's';

// Now ALL durations use seconds everywhere: 1 = 1 second, 0.5 = 500ms
```

### 3. Single-Line Format for Simple Animations (REQUIRED)
```javascript
// GOOD - Clean, readable, one line for simple tweens
animate('.element', { x: 250, duration: 1, ease: 'outQuad' });
```

## Quick Validation Checklist

Before generating anime.js code, verify:
- [ ] Using `import { animate, ... } from 'animejs'` NOT `import anime`
- [ ] Set `engine.timeUnit = 's'` ONLY ONCE in app entry point
- [ ] Using seconds for all durations (1 = 1 second)
- [ ] Simple animations on ONE LINE
- [ ] Using `animate()` NOT `anime()`
- [ ] Using `createTimeline()` NOT `anime.timeline()`
- [ ] Using `ease:` NOT `easing:`
- [ ] Using `to:` for values, NOT `value:`
- [ ] Using `on` prefix for callbacks (onUpdate, onComplete)
- [ ] Using `loop` and `alternate` NOT `direction`
- [ ] Using correct v4 stagger syntax with `stagger()`
- [ ] Using shorthand properties (x, y, z) when possible

## Core API - Most Common Patterns

### Basic Animation (single line for simple tweens)
```javascript
animate('.element', { x: 250, rotate: 180, duration: 0.8, ease: 'inOutQuad' });
animate('.element', { opacity: [0, 1], y: [20, 0], duration: 0.6, ease: 'outQuad' });
animate('.element', { scale: [0, 1], duration: 0.8, ease: 'outElastic(1, 0.5)' });
animate('.element', { rotate: 360, duration: 2, loop: true, ease: 'linear' });
```

### Timeline Creation
```javascript
const tl = createTimeline({ defaults: { duration: 1, ease: 'outQuad' } });

tl.add('.element1', { x: 250 })
  .add('.element2', { y: 100 }, '+=0.2')
  .add('.element3', { rotate: 180 }, '<');
```

### Stagger Animations (single line)
```javascript
animate('.elements', { x: 250, delay: stagger(0.1) });
animate('.elements', { x: 250, delay: stagger(0.1, { from: 'center' }) });
```

## Property Syntax Reference (v3 -> v4)

### Animation Values
```javascript
// v4: Use 'to' for target values
{ opacity: { to: 0.5 } }
{ x: { to: [0, 100, 50], duration: 2 } }
```

### Easing Functions
```javascript
{ ease: 'inOutQuad' }
{ ease: 'outElastic(1, 0.5)' }
{ ease: 'cubicBezier(0.4, 0, 0.2, 1)' }
```

### Direction & Looping
```javascript
{
  loop: true,        // infinite loop
  loop: 3,           // loop 3 times
  alternate: true,   // alternate direction
  reversed: true     // play in reverse
}
```

### Transform Properties (Shorthand Preferred)
```javascript
animate('.element', { x: 100, y: 50, z: 25 });           // shorthand (preferred)
animate('.element', { translateX: 100, translateY: 50 });  // explicit
```

### Callbacks (ALL prefixed with 'on')
```javascript
animate('.element', { x: 250, duration: 1, onComplete: () => console.log('Done!') });

animate('.element', {
  x: 250,
  duration: 1,
  onBegin: (anim) => console.log('Started'),
  onUpdate: (anim) => console.log('Progress:', anim.progress),
  onComplete: (anim) => console.log('Finished')
});
```

## SVG Animations
```javascript
import { animate, svg } from 'animejs';

animate('#path1', { d: svg.morphTo('#path2'), duration: 1 });

const drawable = svg.createDrawable('.svg-path');
animate(drawable, { draw: '0% 100%', duration: 2 });
```

## Utility Functions
```javascript
import { utils } from 'animejs';

const elements = utils.$('.elements');
const currentX = utils.get('.element', 'translateX');
utils.set('.element', { x: 100, opacity: 0.5 });
utils.remove('.element');
utils.random(0, 100);
utils.lerp(0, 100, 0.5);
utils.clamp(150, 0, 100);
```

## Performance Tips

1. Use transforms over position properties (`x` instead of `left`)
2. Batch animations in timelines
3. Use `will-change: transform, opacity` CSS for complex animations

## AI Code Generation Rules

1. **ONLY** set `engine.timeUnit = 's'` ONCE in the app's main entry point
2. **ALWAYS** use seconds for all durations
3. **ALWAYS** format simple animations on ONE LINE
4. **ALWAYS** start with v4 imports
5. **NEVER** use `anime()` function, use `animate()`
6. **NEVER** include `targets` property
7. **ALWAYS** use `ease` not `easing`
8. **NEVER** use `value`, use `to` instead
9. **ALWAYS** prefix callbacks with `on`
10. **ALWAYS** use `createTimeline()` for timelines
