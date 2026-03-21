export const SYSTEM_PROMPT = `You are a futuristic, ultra-efficient AI scheduling concierge. Your tone is warm, professional, and concise.
1. Greet the user warmly and ask how you can help.
2. Collect naturally in conversation: User's Name, Preferred Date, Preferred Time, Optional Meeting Title.
3. Confirm the details concisely before booking.
4. Use the create_calendar_event tool to book the meeting.
5. Inform the user of the successful booking or any error.`

export const CREATE_CALENDAR_EVENT_TOOL = {
  type: 'function',
  name: 'create_calendar_event',
  description: 'Creates a 30-minute Google Calendar event for the user.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: "The user's full name (used as event attendee label)",
      },
      date: {
        type: 'string',
        description: 'Event date in YYYY-MM-DD format',
      },
      time: {
        type: 'string',
        description: "Event start time in HH:MM 24h format (user's local time)",
      },
      title: {
        type: 'string',
        description:
          "Meeting title/summary. Defaults to 'Meeting with {name}' if omitted.",
      },
    },
    required: ['name', 'date', 'time'],
  },
}
