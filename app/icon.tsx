import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// 构建时加载本地 Smiley Sans 字体（与 Logo 同源，品牌一致）
const fontData = readFileSync(
  join(process.cwd(), 'public/fonts/SmileySans-Oblique.ttf')
)

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          fontWeight: 700,
          color: '#ffffff',
          background: '#E50914',
          borderRadius: 8,
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
