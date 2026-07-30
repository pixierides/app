/**
 * Booking step 1 of 3 — the route.
 */
import { router } from 'expo-router';
import { Button, Input } from '@/components/ui';
import { BookScaffold } from '@/components/BookScaffold';
import { useBooking } from '@/providers/booking';

export default function BookRoute() {
  const { draft, update } = useBooking();
  const complete = draft.origin.trim().length > 0 && draft.destination.trim().length > 0;

  return (
    <BookScaffold
      eyebrow="Step 1 of 3"
      title={'Where are we\npicking you up?'}
      footer={
        complete ? (
          <Button size="lg" fullWidth onPress={() => router.push('/book/party')}>
            Next
          </Button>
        ) : null
      }
    >
      <Input
        onDark
        label="Pickup"
        value={draft.origin}
        onChangeText={(t) => update({ origin: t })}
      />
      <Input
        onDark
        label="Drop-off"
        placeholder="Hotel, resort or port"
        value={draft.destination}
        onChangeText={(t) => update({ destination: t })}
      />
    </BookScaffold>
  );
}
