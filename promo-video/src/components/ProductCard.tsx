import React from 'react';
import {Img, staticFile} from 'remotion';
import {C, F} from '../theme';
import {Icon} from './Icons';

export type Product = {
  title: string;
  price: string; // formatted, e.g. '12 000'
  unit: string; // 'кг'
  stock: string; // '1 500 кг в наличии'
  place: string;
  farmer: string;
  photo: string; // public path
  emoji: string;
};

/** Same listings as the screenshots (seeded test data; prices are UI-illustrative). */
export const PRODUCTS: Product[] = [
  {title: 'Помидоры «Бычье сердце»', price: '12 000', unit: 'кг', stock: '1 500 кг в наличии', place: 'Самарканд', farmer: 'Алишер Усмонов', photo: 'photos/tomato.jpg', emoji: 'tomato'},
  {title: 'Яблоки «Самаркандские»', price: '15 000', unit: 'кг', stock: '2 500 кг в наличии', place: 'Самарканд, Ургут', farmer: 'Алишер Усмонов', photo: 'photos/apple.jpg', emoji: 'red-apple'},
  {title: 'Арбуз сладкий', price: '3 500', unit: 'кг', stock: '8 000 кг в наличии', place: 'Фергана, Кува', farmer: 'Ботир Рахимов', photo: 'photos/watermelon.jpg', emoji: 'watermelon'},
  {title: 'Перец болгарский', price: '14 000', unit: 'кг', stock: '900 кг в наличии', place: 'Самарканд, Пайарык', farmer: 'Алишер Усмонов', photo: 'photos/pepper.jpg', emoji: 'bell-pepper'},
  {title: 'Молоко домашнее', price: '9 000', unit: 'литр', stock: '200 литр в наличии', place: 'Фергана', farmer: 'Ботир Рахимов', photo: 'photos/milk.jpg', emoji: 'glass-of-milk'},
  {title: 'Райхон и зелень', price: '3 000', unit: 'пучок', stock: '600 пучок в наличии', place: 'Самарканд', farmer: 'Алишер Усмонов', photo: 'photos/greens.jpg', emoji: 'leafy-green'},
  {title: 'Пшеница твёрдая', price: '4 200', unit: 'кг', stock: '25 000 кг в наличии', place: 'Самарканд, Каттакурган', farmer: 'Алишер Усмонов', photo: 'photos/wheat.jpg', emoji: 'sheaf-of-rice'},
  {title: 'Сыр домашний', price: '65 000', unit: 'кг', stock: '40 кг в наличии', place: 'Фергана, Маргилан', farmer: 'Ботир Рахимов', photo: 'photos/cheese.jpg', emoji: 'glass-of-milk'},
];

/**
 * Rebuilt market card (design v3): photo, title, price + unit, stock, place, farmer, «В корзину».
 * `w` = card width in px; everything scales from it. `dark` switches to the dark theme tokens.
 */
export const ProductCard: React.FC<{p: Product; w: number; dark?: boolean; added?: number; style?: React.CSSProperties}> = ({p, w, dark = false, added = 0, style}) => {
  const k = w / 300;
  const ink = dark ? C.cream : C.ink;
  const ink3 = dark ? '#97A49B' : C.ink3;
  const card = dark ? C.nightCard : C.card;
  const rule = dark ? C.nightRule : C.rule;
  const green = dark ? C.mint : C.field;
  return (
    <div
      style={{
        width: w,
        background: card,
        borderRadius: 18 * k,
        border: `${Math.max(1, 1.5 * k)}px solid ${rule}`,
        boxShadow: dark ? '0 18px 50px rgba(0,0,0,0.35)' : '0 2px 4px rgba(20,40,25,0.05), 0 18px 44px rgba(20,40,25,0.12)',
        overflow: 'hidden',
        fontFamily: F.body,
        ...style,
      }}
    >
      <div style={{position: 'relative', height: w * 0.72, background: dark ? '#0f1a14' : C.sprout}}>
        <Img src={staticFile(p.photo)} style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
      </div>
      <div style={{padding: `${14 * k}px ${16 * k}px ${16 * k}px`}}>
        <div style={{fontFamily: F.brand, fontWeight: 600, fontSize: 19 * k, color: ink, lineHeight: 1.2, height: 46 * k, overflow: 'hidden'}}>{p.title}</div>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 6 * k, marginTop: 8 * k}}>
          <span style={{fontFamily: F.brand, fontWeight: 700, fontSize: 28 * k, color: ink, letterSpacing: '-0.01em'}}>{p.price}</span>
          <span style={{fontSize: 15 * k, color: ink3, fontWeight: 500}}>сум/{p.unit}</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 6 * k, marginTop: 6 * k, fontSize: 13.5 * k, color: ink3}}>
          <Icon name="location-dot" size={13 * k} color={ink3} />
          <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{p.place}</span>
        </div>
        <div
          style={{
            marginTop: 12 * k,
            height: 44 * k,
            borderRadius: 12 * k,
            border: `${2 * k}px solid ${green}`,
            background: added > 0 ? green : 'transparent',
            color: added > 0 ? '#fff' : green,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8 * k,
            fontWeight: 600,
            fontSize: 16 * k,
          }}
        >
          <Icon name={added > 0 ? 'check' : 'basket-shopping'} size={16 * k} color={added > 0 ? '#fff' : green} />
          {added > 0 ? 'В корзине' : 'В корзину'}
        </div>
      </div>
    </div>
  );
};
