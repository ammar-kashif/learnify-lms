import { NextRequest } from 'next/server';
import { getProgressEmitter, disposeProgressEmitter } from '@/lib/upload-progress';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const emitter = getProgressEmitter(id);

      const onProgress = (percent: number) => {
        controller.enqueue(encoder.encode(`event: progress\ndata: ${percent}\n\n`));
      };
      const onDone = () => {
        controller.enqueue(encoder.encode(`event: done\ndata: 100\n\n`));
        controller.close();
        disposeProgressEmitter(id);
      };
      const onError = () => {
        controller.enqueue(encoder.encode(`event: error\ndata: 0\n\n`));
        controller.close();
        disposeProgressEmitter(id);
      };

      emitter.on('progress', onProgress);
      emitter.once('done', onDone);
      emitter.once('error', onError);

      // Kick an initial event
      controller.enqueue(encoder.encode(`event: progress\ndata: 0\n\n`));
    },
    cancel() {
      if (id) disposeProgressEmitter(id);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}



