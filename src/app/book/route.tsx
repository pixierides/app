/**
 * Booking step 1 of 3 — the route.
 */
import { router } from 'expo-router';
import { Button } from '@/components/ui';
import { AddressField } from '@/components/AddressField';
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
      <AddressField
        onDark
        label="Pickup"
        value={draft.origin}
        onChange={(p) =>
          update({
            origin: p.label,
            originAddress: p.address,
            originPlaceId: p.placeId,
            originLat: p.lat,
            originLng: p.lng,
          })
        }
      />
      <AddressField
        onDark
        label="Drop-off"
        placeholder="Hotel, resort or port"
        value={draft.destination}
        onChange={(p) =>
          update({
            destination: p.label,
            destinationAddress: p.address,
            destinationPlaceId: p.placeId,
            destinationLat: p.lat,
            destinationLng: p.lng,
          })
        }
      />
    </BookScaffold>
  );
}
