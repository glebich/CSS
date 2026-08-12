/**
 * The liquid defs. Two filters carry the whole aesthetic:
 *
 * osyle-goo   blurs a group of shapes and then throws the alpha through
 *             a hard contrast curve, so shapes that come near each other
 *             merge like drops of one liquid. Decorative shapes only,
 *             never text, since the same curve would eat the letters.
 *
 * osyle-liquid displaces whatever it filters through soft noise, which
 *             on a backdrop reads as refraction through glass. Every
 *             surface that uses it declares a plain blur first, so a
 *             browser that cannot parse the filter reference keeps its
 *             frost instead of losing the backdrop entirely.
 */
export function LiquidDefs() {
  return (
    <svg className="liquid-defs" width="0" height="0" aria-hidden focusable="false">
      <defs>
        <filter id="osyle-goo" x="-25%" y="-15%" width="150%" height="130%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
        <filter id="osyle-liquid" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.009 0.013"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="4" result="soft" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale="14"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
