import BookingClient from "./booking-client";

export default async function InspectionBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <BookingClient token={token} />;
}
