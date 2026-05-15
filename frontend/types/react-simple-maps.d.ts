// Declaração de módulo para react-simple-maps (sem tipos oficiais)
declare module 'react-simple-maps' {
    import { ComponentType, ReactNode, SVGProps, MouseEvent } from 'react';

    interface ProjectionConfig {
        scale?: number;
        center?: [number, number];
        rotate?: [number, number, number];
        parallels?: [number, number];
    }

    interface ComposableMapProps {
        projection?: string;
        projectionConfig?: ProjectionConfig;
        width?: number;
        height?: number;
        style?: React.CSSProperties;
        className?: string;
        children?: ReactNode;
    }

    interface ZoomableGroupProps {
        center?: [number, number];
        zoom?: number;
        minZoom?: number;
        maxZoom?: number;
        translateExtent?: [[number, number], [number, number]];
        children?: ReactNode;
    }

    interface GeographiesProps {
        geography: string | object;
        children: (props: { geographies: any[] }) => ReactNode;
    }

    interface GeographyProps {
        geography: any;
        style?: {
            default?: React.CSSProperties | Record<string, unknown>;
            hover?: React.CSSProperties | Record<string, unknown>;
            pressed?: React.CSSProperties | Record<string, unknown>;
        };
        className?: string;
        onMouseEnter?: (event: React.MouseEvent<SVGPathElement>) => void;
        onMouseLeave?: (event: React.MouseEvent<SVGPathElement>) => void;
        onClick?: (event: React.MouseEvent<SVGPathElement>) => void;
    }

    interface MarkerProps {
        coordinates: [number, number];
        children?: ReactNode;
        onMouseEnter?: (event: React.MouseEvent<SVGGElement>) => void;
        onMouseLeave?: (event: React.MouseEvent<SVGGElement>) => void;
        onClick?: (event: React.MouseEvent<SVGGElement>) => void;
    }

    export const ComposableMap: ComponentType<ComposableMapProps>;
    export const ZoomableGroup: ComponentType<ZoomableGroupProps>;
    export const Geographies: ComponentType<GeographiesProps>;
    export const Geography: ComponentType<GeographyProps>;
    export const Marker: ComponentType<MarkerProps>;
    export const Sphere: ComponentType<any>;
    export const Graticule: ComponentType<any>;
    export const Line: ComponentType<any>;
    export const Annotation: ComponentType<any>;
}
