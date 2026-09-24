import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clientIp, HttpError, jsonError } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { availableSlots, isBookableDate, slotStart, slotTimesFor } from '@/lib/schedule';

export async function GET(request: Request) {
  try {
    const date = new URL(request.url).searchParams.get('date') ?? '';
    if (!isBookableDate(date)) throw new HttpError(422, 'That date is not open for booking.');
    await enforceRateLimit('read', clientIp(request));

    const times = slotTimesFor(date);
    const bookings = await prisma.booking.findMany({
      where: { startsAt: { gte: slotStart(date, times[0]), lte: slotStart(date, times.at(-1)!) } },
      select: { startsAt: true },
    });
    return NextResponse.json(
      { date, slots: availableSlots(date, bookings.map((b) => b.startsAt)) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return jsonError(error);
  }
}
