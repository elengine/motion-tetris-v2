import { Application, Container, Graphics, RenderTexture, Sprite, Texture } from 'pixi.js';

/**
 * PixiJS v8 アプリケーションの初期化とリサイズ管理。
 * visualViewport（URLバー等を除いた実際の可視領域）に追従する。
 */
export async function createPixiApp(
  mount: HTMLElement,
): Promise<{ app: Application; onResize: (cb: () => void) => void; dispose: () => void }> {
  const app = new Application();
  await app.init({
    background: 0x0a0e27,
    resizeTo: mount,
    antialias: true,
    preference: 'webgl', // WebGPU は環境により不安定のため WebGL を既定（Fold8は対応だが安定優先）
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  mount.appendChild(app.canvas);
  app.canvas.style.position = 'fixed';
  app.canvas.style.inset = '0';
  app.canvas.style.display = 'block';

  const callbacks: (() => void)[] = [];
  const resize = () => {
    callbacks.forEach((cb) => cb());
  };
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resize);
    window.visualViewport.addEventListener('scroll', resize);
  }

  return {
    app,
    onResize: (cb) => callbacks.push(cb),
    dispose: () => {
      window.removeEventListener('resize', resize);
      app.destroy(true, { children: true });
    },
  };
}

export { Container, Graphics, Sprite, Texture, RenderTexture };
