import type { ReactNode } from 'react'
import { useTextScale } from '../theme/textScale'

export default function AboutPage() {
  const scale = useTextScale()
  const P = ({ children }: { children: ReactNode }) => <p style={{ margin: '0 0 12px', fontSize: 14 * scale, lineHeight: 1.6 }}>{children}</p>
  const H = ({ children }: { children: ReactNode }) => <h2 style={{ margin: '20px 0 6px', fontSize: 16 * scale, fontWeight: 600 }}>{children}</h2>
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ margin: '0 0 12px', fontSize: 22 * scale, fontWeight: 700 }}>MHGU LookUp</h1>
        <P>
          A reference app for <strong>Monster Hunter Generations Ultimate</strong>: weapons, armor skills, Hunting
          Styles, Hunter Arts and items, with more tabs filled in as their data is read from the game.
          Created by <strong>Armored_Raven</strong>, as the GU sibling of the MHFU LookUp.
        </P>

        <H>Where the data comes from</H>
        <P>
          Every name, description and value is read from the game's own text and data tables (dumped from a
          personally-owned copy). Nothing is carried over from the MHFU app or taken from guides; community
          databases were used only to check that a table had been read right. No game files are redistributed.
        </P>
        <P>
          The armor skill explanations are the ones written for MHGU Armor Skills Explained, read from the
          game's code and data the same way.
        </P>

        <H>Development</H>
        <P>
          Built with substantial help from <a href="https://claude.com/claude-code" target="_blank" rel="noopener">Claude Code</a>,
          Anthropic's AI coding tool: most of the code, the data tools and the text were written with AI assistance,
          directed and reviewed by the author. Errors may remain; verify any value you rely on.
        </P>

        <H>Credits</H>
        <P>
          The app shell (layout, search, bookmarks, notes, settings) comes from the MHFU LookUp. The MHFU display
          font is a fan-made recreation of the Monster Hunter interface typeface; the menu textures are carried
          over from the sibling apps.
        </P>

        <H>License</H>
        <P>
          Source code: MIT License. <strong>Monster Hunter</strong> names, text and other game content are
          © CAPCOM CO., LTD., used here as non-commercial fan content. This app is not affiliated with or
          endorsed by Capcom.
        </P>
      </div>
    </div>
  )
}
