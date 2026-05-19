import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  const vapidKeys = webpush.generateVAPIDKeys();
  return Response.json({
    publicKey: vapidKeys.publicKey,
    privateKey: vapidKeys.privateKey,
    note: "Salve publicKey em VAPID_PUBLIC_KEY (no código) e privateKey em FCM_VAPID_KEY (secret)"
  });
});