// @flow

import React, { memo } from "react";
import { createPortal } from "react-dom";

import type { NFTMetadata } from "@ledgerhq/live-common/lib/types";
import IconCross from "~/renderer/icons/Cross";
import Media from "~/renderer/components/Nft/Media";

import PrismaZoom from "react-prismazoom";

import styled from "styled-components";

const Container = styled.div`
  background-color: rgba(0, 0, 0, 0.4);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  padding: 32px 32px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const NFTImageContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const CloseButton = styled.button`
  border: none;
  background-color: rgba(0, 0, 0, 0);
  position: absolute;
  top: 48px;
  right: 48px;
  color: white;
  cursor: pointer;
  z-index: 1;
`;

const domNode = document.getElementById("modals");

type NftPanAndZoomProps = {
  onClose: () => void,
  metadata: NFTMetadata,
  tokenId: string,
};

type BodyProps = { metadata: NFTMetadata, tokenId: string };

const NftPanAndZoomBody = ({ metadata, tokenId }: BodyProps) => (
  <NFTImageContainer>
    <PrismaZoom
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Media
        metadata={metadata}
        tokenId={tokenId}
        mediaFormat="original"
        full
        square={false}
        objectFit="scale-down"
        onClick={(e: Event) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </PrismaZoom>
  </NFTImageContainer>
);

const NftPanAndZoom = ({ onClose, metadata, tokenId }: NftPanAndZoomProps) => {
  const modal = (
    <Container onClick={onClose}>
      <CloseButton onClick={onClose} className="sidedrawer-close">
        <IconCross size={32} />
      </CloseButton>
      <NftPanAndZoomBody metadata={metadata} tokenId={tokenId} />
    </Container>
  );

  // we use the same portal as modals but don't use the modal component itself because we need
  // to handle the size of the model differently
  return domNode ? createPortal(modal, domNode) : null;
};

export default memo<NftPanAndZoomProps>(NftPanAndZoom);
