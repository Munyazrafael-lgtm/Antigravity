import { useState, useEffect } from 'react';
import styles from './WelcomeScreen.module.css';

const WelcomeScreen = ({ onNameSubmit }) => {
  const [name, setName] = useState('');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const input = document.querySelector('input[name="client-name"]');
    if (input) input.focus();
  }, []);

  const handleSubmit = (e) => {
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