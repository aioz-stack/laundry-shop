import { Mascot } from 'page-mascot';

/**
 * Counter companion for the POS screen, using `page-mascot`
 * (MIT, https://github.com/nilbuild/page-mascot).
 *
 * The fox is two 3x3 sprite sheets served from `public/mascots`: one for the
 * head directions and one for the reactions. The library tracks the cursor,
 * reacts to a click, disables tracking on touch/coarse pointers, and honours
 * `prefers-reduced-motion`.
 */
export function CounterMascot({ size = 88 }: { size?: number }) {
  return (
    <div className="no-print hidden flex-col items-center gap-1.5 sm:flex">
      <Mascot
        directions="/mascots/fox-directions.webp"
        reactions="/mascots/fox-reactions.webp"
        size={size}
        label="counter fox"
      />
      <span className="text-[10.5px] font-semibold tracking-[0.16em] text-ink-400 uppercase">Poke me</span>
    </div>
  );
}
