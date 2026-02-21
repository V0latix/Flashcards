import { useI18n } from '../i18n/useI18n'

function LeitnerInfo() {
  const { t } = useI18n()

  return (
    <div className="leitner-info" tabIndex={0} aria-label={t('info.aria')}>
      <span className="leitner-info-trigger" aria-hidden="true">
        i
      </span>
      <div className="leitner-tooltip" role="tooltip">
        <h3>{t('info.title')}</h3>
        <p>{t('info.flashcard1')}</p>
        <p>{t('info.flashcard2')}</p>
        <p className="leitner-tooltip-subtitle">{t('info.leitnerTitle')}</p>
        <p>{t('info.leitner1')}</p>
        <ul>
          <li>{t('info.box1')}</li>
          <li>{t('info.box2')}</li>
          <li>{t('info.box3')}</li>
          <li>{t('info.box4')}</li>
          <li>{t('info.box5')}</li>
        </ul>
        <p>{t('info.cadence')}</p>
        <p>{t('info.why')}</p>
      </div>
    </div>
  )
}

export default LeitnerInfo
