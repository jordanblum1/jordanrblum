import stampShift from '../assets/studio-work/stamp-shift-iphone.webp';
import alive from '../assets/studio-work/alive-still-iphone.webp';
import birthday from '../assets/studio-work/birthday-iphone.webp';

export const iosApps = [
  { id: 'stamp-shift', title: 'Stamp Shift', description: 'Sort stamps into one perfect order.', image: stampShift, tone: 'stamp', alt: 'Stamp Shift’s real Route 20 stamp puzzle on an iPhone.' },
  { id: 'alive-still', title: 'Alive Still', description: 'A daily safety check-in for people who live alone.', image: alive, tone: 'alive', alt: 'Alive Still’s daily safety check-in screen on an iPhone.' },
  { id: 'birthday', title: 'Birthday', description: 'Birthdays, reminders and thoughtful gift ideas.', image: birthday, tone: 'birthday', alt: 'Birthday’s upcoming birthdays screen on an iPhone, with fictional sample contacts.' },
] as const;
