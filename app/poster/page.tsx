'use client';
import { useEffect } from 'react';
import './poster.css';

export default function PosterPage() {
  useEffect(() => {
    document.body.style.background = '#2a2a3e';
    return () => { document.body.style.background = ''; };
  }, []);

  return (
    <div className="poster-page">
      {/* 背景装饰 */}
      <div className="bg-decor">
        <div className="circle c1" />
        <div className="circle c2" />
        <div className="circle c3" />
        <div className="star s1">✦</div>
        <div className="star s2">✦</div>
        <div className="star s3">✧</div>
        <div className="star s4">✧</div>
        <div className="star s5">⋆</div>
      </div>

      {/* 顶部：品牌 + 二维码 */}
      <header className="poster-header">
        <div className="header-left">
          <div className="brand-icon">🎓</div>
          <h1 className="brand-name">韦达学习</h1>
          <p className="brand-tagline">AI 交互式学习平台</p>
        </div>
        <div className="header-qr">
          <div className="qr-box">
            <img
              src="/qr-adventure.png"
              alt="扫码开始学习"
              className="qr-image"
            />
          </div>
          <p className="qr-label">扫码开始学习</p>
        </div>
      </header>

      {/* 主标语 */}
      <section className="hero-section">
        <h2 className="hero-title">
          暑假超车
          <br />
          <span className="highlight">从数学开始</span>
        </h2>
        <p className="hero-subtitle">
          沉浸式AI课堂 · 游戏化闯关 · 智能学习路径
        </p>
      </section>

      {/* 学习树 - 6年级在上，1年级在下 */}
      <section className="learning-tree">
        <h3 className="section-title">小学数学学习路径</h3>
        <div className="tree-container">
          {/* 树干 */}
          <div className="trunk" />

          {/* 六年级下 - 最顶部右侧 */}
          <div className="tree-branch right top">
            <div className="branch-line" />
            <div className="branch-node">
              <span className="node-grade grade6">六年级下</span>
              <span className="node-topics">负数 · 比例 · 总复习</span>
            </div>
          </div>

          {/* 六年级上 - 左侧 */}
          <div className="tree-branch left">
            <div className="branch-line" />
            <div className="branch-node">
              <span className="node-grade grade6">六年级上</span>
              <span className="node-topics">分数乘除 · 圆 · 百分数</span>
            </div>
          </div>

          {/* 五年级下 */}
          <div className="tree-branch right">
            <div className="branch-line" />
            <div className="branch-node">
              <span className="node-grade grade5">五年级下</span>
              <span className="node-topics">分数加减 · 长方体 · 统计与概率</span>
            </div>
          </div>

          {/* 五年级上 */}
          <div className="tree-branch left">
            <div className="branch-line" />
            <div className="branch-node">
              <span className="node-grade grade5">五年级上</span>
              <span className="node-topics">小数乘除 · 简易方程 · 多边形面积</span>
            </div>
          </div>

          {/* 四年级下 */}
          <div className="tree-branch right">
            <div className="branch-line" />
            <div className="branch-node">
              <span className="node-grade grade4">四年级下</span>
              <span className="node-topics">四则运算 · 运算定律 · 小数加减</span>
            </div>
          </div>

          {/* 四年级上 */}
          <div className="tree-branch left">
            <div className="branch-line" />
            <div className="branch-node">
              <span className="node-grade grade4">四年级上</span>
              <span className="node-topics">大数认识 · 三位数乘除 · 角的度量</span>
            </div>
          </div>

          {/* 三年级下 */}
          <div className="tree-branch right">
            <div className="branch-line" />
            <div className="branch-node">
              <span className="node-grade grade3">三年级下</span>
              <span className="node-topics">位置方向 · 面积 · 小数初步</span>
            </div>
          </div>

          {/* 三年级上 */}
          <div className="tree-branch left">
            <div className="branch-line" />
            <div className="branch-node">
              <span className="node-grade grade3">三年级上</span>
              <span className="node-topics">时分秒 · 万以内加减 · 分数初步</span>
            </div>
          </div>

          {/* 二年级下 */}
          <div className="tree-branch right">
            <div className="branch-line" />
            <div className="branch-node">
              <span className="node-grade grade2">二年级下</span>
              <span className="node-topics">除法 · 混合运算 · 克与千克</span>
            </div>
          </div>

          {/* 二年级上 */}
          <div className="tree-branch left">
            <div className="branch-line" />
            <div className="branch-node">
              <span className="node-grade grade2">二年级上</span>
              <span className="node-topics">长度单位 · 100以内加减 · 乘法口诀</span>
            </div>
          </div>

          {/* 一年级下 */}
          <div className="tree-branch right">
            <div className="branch-line" />
            <div className="branch-node">
              <span className="node-grade grade1">一年级下</span>
              <span className="node-topics">20以内退位减 · 认识图形 · 人民币</span>
            </div>
          </div>

          {/* 一年级上 - 最底部 */}
          <div className="tree-branch left bottom">
            <div className="branch-line" />
            <div className="branch-node crown">
              <span className="node-grade grade1">一年级上</span>
              <span className="node-topics">1~5的认识 · 比大小 · 加减法</span>
            </div>
          </div>

          {/* 底部根基 */}
          <div className="tree-root">🌱 扎实基础，步步攀登</div>
        </div>
      </section>

      {/* 底部号召 */}
      <footer className="poster-footer">
        <div className="cta-badges">
          <span className="badge hot">暑假预习首选</span>
          <span className="badge">免费体验</span>
          <span className="badge">Android App</span>
        </div>
        <p className="footer-tip">向上攀登 · 每一步都算数</p>
      </footer>

      {/* 打印按钮 */}
      <button className="print-btn" onClick={() => window.print()}>
        🖨️ 打印 / 保存为PDF
      </button>
    </div>
  );
}
