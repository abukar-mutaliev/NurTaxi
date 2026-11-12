import { SafetyCertificateOutlined, TeamOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, Steps, Typography, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useOtpStatusMutation, useRequestOtpMutation, useVerifyOtpMutation } from '@/entities/user';
import type { User } from '@/entities/user';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { setUser, setBootstrapped } from '@/features/auth';
import { tokenStorage } from '@/shared/lib/token-storage';
import { getErrorMessage, normalizePhoneInput } from '@/shared/lib/utils';
import { isAdminRole } from '@/shared/rbac';
import { NurMark } from '@/shared/ui';
import styles from './login-page.module.css';

const { Title, Paragraph, Text } = Typography;

export function LoginPage() {
  const { t } = useTranslation(); 
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.session.isAuthenticated);
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [method, setMethod] = useState<'sms' | 'mobile-id'>('sms');
  const [challenge, setChallenge] = useState<'pending' | 'otp_required'>('otp_required');
  const [requestOtp, { isLoading: sending }] = useRequestOtpMutation();
  const [verifyOtp, { isLoading: verifying }] = useVerifyOtpMutation();
  const [pollStatus] = useOtpStatusMutation();
  const [error, setError] = useState<string | null>(null);
  const finished = useRef(false);
  const isDev = import.meta.env.DEV;

  const acceptSession = useCallback(
    (result: { accessToken: string; refreshToken: string; user: User }) => {
      if (!isAdminRole(result.user.role)) {
        setError(t('auth.accessDeniedHint'));
        return;
      }
      tokenStorage.save({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      dispatch(setUser(result.user));
      dispatch(setBootstrapped(true));
      navigate('/', { replace: true });
    },
    [dispatch, navigate, t],
  );

  useEffect(() => {
    if (step !== 1 || method !== 'mobile-id' || !phone) return;

    let cancelled = false;
    const tick = async () => {
      if (finished.current || cancelled) return;
      try {
        const result = await pollStatus({ phone }).unwrap();
        if (cancelled || finished.current) return;
        if (result.status === 'pending' || result.status === 'otp_required') {
          setChallenge(result.status);
        }
        if (result.status === 'failed') {
          finished.current = true;
          setError(t('auth.mobileIdFailed'));
          return;
        }
        if (result.accessToken && result.refreshToken && result.user) {
          finished.current = true;
          acceptSession({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
          });
        }
      } catch (err) {
        if (!cancelled) {
          finished.current = true;
          setError(getErrorMessage(err, 'Не удалось проверить подтверждение'));
        }
      }
    };

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [acceptSession, step, method, phone, pollStatus, t]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handlePhoneSubmit = async (values: { phone: string }) => {
    setError(null);
    const normalized = normalizePhoneInput(values.phone);
    try {
      const result = await requestOtp({ phone: normalized }).unwrap();
      setPhone(normalized);
      setDevCode(result.devCode ?? null);
      setMethod(result.method ?? 'sms');
      setChallenge(result.status === 'pending' ? 'pending' : 'otp_required');
      finished.current = false;
      setStep(1);
      message.success(result.method === 'mobile-id' ? 'Запрос отправлен' : 'Код отправлен');
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось отправить код'));
    }
  };

  const handleCodeSubmit = async (values: { code: string }) => {
    setError(null);
    try {
      const result = await verifyOtp({ phone, code: String(values.code) }).unwrap();
      finished.current = true;
      acceptSession(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Неверный код'));
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.logoMark}>
            <NurMark size={36} />
          </div>
          <Title level={1} className={styles.heroTitle}>
            Nur Taxi
          </Title>
          <Paragraph className={styles.heroText}>
            Панель управления платформой женского такси. Регионы, тарифы, верификация водителей и
            операторская консоль — в одном месте.
          </Paragraph>
          <div className={styles.features}>
            <div className={styles.feature}>
              <SafetyCertificateOutlined />
              <span>RBAC и изоляция регионов</span>
            </div>
            <div className={styles.feature}>
              <TeamOutlined />
              <span>Модерация водителей и заказов</span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          <Title level={3} style={{ marginBottom: 8 }}>
            {t('auth.login')}
          </Title>
          <Text type="secondary">Вход по номеру телефона и SMS-коду</Text>

          <Steps
            current={step}
            size="small"
            style={{ margin: '24px 0' }}
            items={[{ title: 'Телефон' }, { title: 'Код' }]}
          />

          {error && (
            <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} closable />
          )}

          {step === 0 ? (
            <Form layout="vertical" onFinish={handlePhoneSubmit} requiredMark={false}>
              <Form.Item
                name="phone"
                label={t('auth.phone')}
                rules={[{ required: true, message: 'Введите номер телефона' }]}
              >
                <Input
                  size="large"
                  placeholder={t('auth.phonePlaceholder')}
                  autoComplete="tel"
                  inputMode="tel"
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={sending}>
                {t('auth.sendCode')}
              </Button>
            </Form>
          ) : (
            <Form layout="vertical" onFinish={handleCodeSubmit} requiredMark={false}>
              {method === 'mobile-id' && challenge === 'pending' ? (
                <Alert
                  type="info"
                  showIcon
                  message={t('auth.mobileIdHint')}
                  style={{ marginBottom: 16 }}
                />
              ) : null}
              {isDev && devCode ? (
                <Alert
                  type="info"
                  showIcon
                  message={t('auth.devCodeHint', { code: devCode })}
                  style={{ marginBottom: 16 }}
                />
              ) : null}
              <Form.Item
                name="code"
                label={t('auth.code')}
                rules={[{ required: true, message: 'Введите код из SMS' }]}
              >
                <Input.OTP length={4} size="large" />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={verifying}>
                {t('auth.verify')}
              </Button>
              <Button
                type="link"
                block
                onClick={() => {
                  setStep(0);
                  setDevCode(null);
                }}
                style={{ marginTop: 8 }}
              >
                Изменить номер
              </Button>
            </Form>
          )}

          <Paragraph type="secondary" className={styles.hint}>
            {t('auth.testAccountsHint')}
          </Paragraph>
        </div>
      </div>
    </div>
  );
}
