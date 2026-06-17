import { useState, useEffect, useRef, type FormEvent } from 'react';
import styles from './WelcomeScreen.module.css';

interface WelcomeScreenProps {
  onNameSubmit: (name: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNameSubmit }) => {
  const [name, setName] = useState('');
  const [showError, setShowError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onNameSubmit(trimmed);
    } else {
      setShowError(true);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h1 className={styles.title}>Bienvenido a Visor Territorios</h1>
        <p className={styles.subtitle}>Por favor, ingresa tu nombre para continuar</p>
        {showError && <div className={styles.error}>El nombre no puede estar vacío</div>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            ref={inputRef}
            type="text"
            name="client-name"
            placeholder="Ej: Juan Pérez"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={styles.confirmButton}>Continuar</button>
        </form>
      </div>
    </div>
  );
};

export default WelcomeScreen;
