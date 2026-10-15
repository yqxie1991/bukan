import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const fontData = readFileSync(
  join(process.cwd(), 'public/fonts/SmileySans-Oblique.ttf')
)

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 146,
          fontWeight: 700,
          color: '#ffffff',
          background: '#E50914',
          borderRadius: 44,
          fontFamily: 'Smiley Sans',
          letterSpacing: '-0.02em',
        }}
      >
        看
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Smiley Sans', data: fontData, weight: 700, style: 'normal' }],
    }
  )
}
