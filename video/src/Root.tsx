import { Composition } from "remotion"
import { videos } from "./scripts/index.ts"
import { FPS, Video, totalFrames } from "./Video"

export function Root() {
  return (
    <>
      {videos.map((v) => (
        <Composition key={v.id} id={v.id} component={Video} defaultProps={{ id: v.id }} durationInFrames={totalFrames(v)} fps={FPS} width={1920} height={1080} />
      ))}
    </>
  )
}
