# reminders/tasks.py
from celery import shared_task
from django.utils import timezone
from .models import Reminder

@shared_task
def send_reminder(reminder_id):
    try:
        reminder = Reminder.objects.get(id=reminder_id)
        # Add your custom logic to notify user
        print(f"Reminder: {reminder.title} at {reminder.time} for {reminder.user}")
    except Reminder.DoesNotExist:
        print(f"Reminder with ID {reminder_id} does not exist.")
