import './App.css';
import { MentionTextarea, User } from './components/MentionTextarea/MentionTextarea';

   const usersMock: User[] = [
    { id: '1', name: 'Иван Иванов', username: 'ivanov' },
    { id: '2', name: 'Мария Петрова', username: 'petrova' },
    { id: '3', name: 'Пётр Сидоров', username: 'sid' },
    
  ];

function App() {
  return (
    <>
      <h1>Mention Textarea test</h1>
      <MentionTextarea users={usersMock} />
    </>
  );
}

export default App;
