import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email, panel, title, message, type = 'info', request_id } = await req.json();

    if (!user_email || !panel || !title || !message) {
      return Response.json(
        { error: 'Missing required fields: user_email, panel, title, message' },
        { status: 400 }
      );
    }

    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email,
      panel,
      title,
      message,
      type,
      request_id,
      is_read: false,
    });

    return Response.json({ success: true, notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});